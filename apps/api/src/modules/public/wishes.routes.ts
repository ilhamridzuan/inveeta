import { Hono, type Context } from 'hono';
import { zValidator } from '../../utils/validator.js';
import crypto from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { db, wishes, events } from '@inveeta/db';
import { eq, and, desc, lt, type SQL } from 'drizzle-orm';
import {
  createWishSchema,
  SYSTEM_LIMITS,
  type CreateWishInput,
  type WishDTO,
  type PaginatedWishesDTO,
} from '@inveeta/shared';
import {
  NotFoundError,
  BadRequestError,
  AppError,
} from '../../utils/errors.js';
import { appEventBus } from '../realtime/bus.js';

interface IpRateLimitRecord {
  lastWishAt: number;
  history: number[];
}

class WishRateLimiter {
  private readonly records = new Map<string, IpRateLimitRecord>();
  private readonly cooldownMs =
    SYSTEM_LIMITS.WISHES.COOLDOWN_PER_IP_SECONDS * 1000;
  private readonly windowMs = 10 * 60 * 1000;
  private readonly maxInWindow = SYSTEM_LIMITS.WISHES.MAX_PER_10_MINUTES;

  checkAndRecord(ip: string): void {
    const now = Date.now();
    const record = this.records.get(ip);

    if (record) {
      if (now - record.lastWishAt < this.cooldownMs) {
        const remainingSeconds = Math.ceil(
          (this.cooldownMs - (now - record.lastWishAt)) / 1000
        );
        throw new AppError(
          429,
          'RATE_LIMIT_EXCEEDED',
          `Mohon tunggu ${remainingSeconds} detik sebelum mengirim ucapan berikutnya.`
        );
      }

      const validHistory = record.history.filter(
        (timestamp) => now - timestamp < this.windowMs
      );
      if (validHistory.length >= this.maxInWindow) {
        throw new AppError(
          429,
          'RATE_LIMIT_EXCEEDED',
          `Batas maksimal ${this.maxInWindow} ucapan per 10 menit telah tercapai. Silakan coba lagi nanti.`
        );
      }

      validHistory.push(now);
      this.records.set(ip, {
        lastWishAt: now,
        history: validHistory,
      });
    } else {
      this.records.set(ip, {
        lastWishAt: now,
        history: [now],
      });
    }

    if (this.records.size > 10000) {
      this.cleanup(now);
    }
  }

  private cleanup(now: number): void {
    for (const [ip, rec] of this.records.entries()) {
      if (now - rec.lastWishAt > this.windowMs) {
        this.records.delete(ip);
      }
    }
  }
}

const wishRateLimiter = new WishRateLimiter();

function getClientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  return c.req.header('x-real-ip') || '127.0.0.1';
}

function hashIp(clientIp: string): string {
  return crypto
    .createHash('sha256')
    .update(`${clientIp}:inveeta_ip_salt`)
    .digest('hex');
}

export function sanitizeWishText(rawMessage: string): string {
  return sanitizeHtml(rawMessage, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export const publicWishesRoutes = new Hono()
  /**
   * Mengambil daftar ucapan publik dengan paginasi berbasis kursor
   * GET /api/v1/public/wishes/:eventId
   */
  .get('/:eventId', async (c) => {
    const eventId = c.req.param('eventId');
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 20, 1), 50);
    const cursor = c.req.query('cursor');

    const conditions: SQL[] = [
      eq(wishes.eventId, eventId),
      eq(wishes.isHidden, false),
    ];

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        conditions.push(lt(wishes.createdAt, cursorDate));
      }
    }

    const rows = await db
      .select({
        id: wishes.id,
        senderName: wishes.senderName,
        message: wishes.message,
        createdAt: wishes.createdAt,
      })
      .from(wishes)
      .where(and(...conditions))
      .orderBy(desc(wishes.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && resultRows.length > 0
        ? resultRows[resultRows.length - 1].createdAt.toISOString()
        : null;

    const formattedWishes: WishDTO[] = resultRows.map((wish) => ({
      id: wish.id,
      senderName: wish.senderName,
      message: wish.message,
      senderRelation: null,
      createdAt: wish.createdAt.toISOString(),
    }));

    const responseData: PaginatedWishesDTO = {
      wishes: formattedWishes,
      nextCursor,
      hasMore,
    };

    return c.json({
      success: true,
      data: responseData,
    });
  })

  /**
   * Mengirim ucapan tamu baru (Anti-XSS, Rate Limiting & Realtime Broadcast)
   * POST /api/v1/public/wishes
   */
  .post('/', zValidator('json', createWishSchema), async (c) => {
    const input: CreateWishInput = c.req.valid('json');

    // 1. Terapkan Rate Limiting Ketat Anti-Spam (AGENTS.md & TDD)
    const clientIp = getClientIp(c);
    wishRateLimiter.checkAndRecord(clientIp);

    // 2. Verifikasi keberadaan acara
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, input.eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    // 3. Sanitasi teks Anti-XSS (sanitize-html dengan allowedTags: [])
    const cleanSenderName = sanitizeWishText(input.senderName);
    const cleanMessage = sanitizeWishText(input.message);

    if (cleanSenderName.length < SYSTEM_LIMITS.WISHES.MIN_NAME_LENGTH) {
      throw new BadRequestError(
        'INVALID_NAME',
        `Nama pengirim minimal ${SYSTEM_LIMITS.WISHES.MIN_NAME_LENGTH} karakter`
      );
    }

    if (cleanMessage.length < SYSTEM_LIMITS.WISHES.MIN_MESSAGE_LENGTH) {
      throw new BadRequestError(
        'INVALID_MESSAGE',
        `Ucapan minimal ${SYSTEM_LIMITS.WISHES.MIN_MESSAGE_LENGTH} karakter`
      );
    }

    // 4. Hash IP untuk kepatuhan privasi (UU PDP)
    const ipHash = hashIp(clientIp);

    // 5. Simpan ke tabel wishes
    const [newWish] = await db
      .insert(wishes)
      .values({
        eventId: input.eventId,
        guestId: input.guestId || null,
        senderName: cleanSenderName,
        message: cleanMessage,
        isHidden: false,
        ipHash,
      })
      .returning();

    const wishDTO: WishDTO = {
      id: newWish.id,
      senderName: newWish.senderName,
      message: newWish.message,
      senderRelation: input.senderRelation || null,
      createdAt: newWish.createdAt.toISOString(),
    };

    // 6. Pancarkan event 'wish.created' ke AppEventBus
    appEventBus.publish({
      eventId: input.eventId,
      type: 'wish.created',
      payload: wishDTO,
      timestamp: newWish.createdAt.toISOString(),
    });

    return c.json(
      {
        success: true,
        data: wishDTO,
      },
      201
    );
  });
