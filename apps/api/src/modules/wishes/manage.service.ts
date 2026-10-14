import { db, wishes } from '@inveeta/db';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import {
  type GetManageWishesQueryInput,
  type ManageWishItemDTO,
  type PaginatedManageWishesDTO,
} from '@inveeta/shared';
import { NotFoundError } from '../../utils/errors.js';
import { appEventBus } from '../realtime/bus.js';

export class WishesManageService {
  /**
   * Mengambil seluruh ucapan untuk Host (termasuk isHidden = true) dengan filter status dan paginasi.
   */
  async getManageWishes(
    eventId: string,
    query: Partial<GetManageWishesQueryInput> = {}
  ): Promise<PaginatedManageWishesDTO> {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(wishes.eventId, eventId)];

    if (query.status === 'visible') {
      conditions.push(eq(wishes.isHidden, false));
    } else if (query.status === 'hidden') {
      conditions.push(eq(wishes.isHidden, true));
    }

    const whereClause = and(...conditions);

    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(wishes)
      .where(whereClause);

    const rows = await db
      .select({
        id: wishes.id,
        eventId: wishes.eventId,
        guestId: wishes.guestId,
        senderName: wishes.senderName,
        message: wishes.message,
        isHidden: wishes.isHidden,
        createdAt: wishes.createdAt,
      })
      .from(wishes)
      .where(whereClause)
      .orderBy(desc(wishes.createdAt))
      .limit(limit)
      .offset(offset);

    const items: ManageWishItemDTO[] = rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      guestId: r.guestId,
      senderName: r.senderName,
      message: r.message,
      senderRelation: null,
      isHidden: r.isHidden,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  /**
   * Mengubah status visibilitas ucapan (Soft Moderation) dan memancarkan event realtime.
   */
  async toggleWishVisibility(
    eventId: string,
    wishId: string,
    isHidden: boolean
  ): Promise<ManageWishItemDTO> {
    const [updated] = await db
      .update(wishes)
      .set({ isHidden })
      .where(and(eq(wishes.id, wishId), eq(wishes.eventId, eventId)))
      .returning();

    if (!updated) {
      throw new NotFoundError('Ucapan tidak ditemukan');
    }

    const wishDTO: ManageWishItemDTO = {
      id: updated.id,
      eventId: updated.eventId,
      guestId: updated.guestId,
      senderName: updated.senderName,
      message: updated.message,
      senderRelation: null,
      isHidden: updated.isHidden,
      createdAt: updated.createdAt.toISOString(),
    };

    appEventBus.publish({
      eventId,
      type: 'wish.moderated',
      payload: {
        wishId: updated.id,
        isHidden: updated.isHidden,
      },
      timestamp: new Date().toISOString(),
    });

    return wishDTO;
  }

  /**
   * Menghapus permanen ucapan dari database (Hard Delete) dan memancarkan event realtime.
   */
  async deleteWish(
    eventId: string,
    wishId: string
  ): Promise<{ id: string }> {
    const [deleted] = await db
      .delete(wishes)
      .where(and(eq(wishes.id, wishId), eq(wishes.eventId, eventId)))
      .returning({ id: wishes.id });

    if (!deleted) {
      throw new NotFoundError('Ucapan tidak ditemukan');
    }

    appEventBus.publish({
      eventId,
      type: 'wish.deleted',
      payload: { wishId: deleted.id },
      timestamp: new Date().toISOString(),
    });

    appEventBus.publish({
      eventId,
      type: 'metrics.updated',
      payload: { eventId },
      timestamp: new Date().toISOString(),
    });

    return { id: deleted.id };
  }
}

export const wishesManageService = new WishesManageService();
