import {
  db,
  waMessageTemplates,
  events,
  guests,
} from '@inveeta/db';
import { eq, and } from 'drizzle-orm';
import {
  DEFAULT_WA_MESSAGE_TEMPLATE,
  normalizeWhatsAppNumber,
  formatEventDateTime,
  type WaTemplateDTO,
  type WhatsAppLinkDTO,
  type IndonesiaTimeZone,
} from '@inveeta/shared';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export class WhatsAppService {
  /**
   * Mengambil template pesan WhatsApp untuk acara tertentu.
   * Mengembalikan fallback template default jika belum pernah dikustomisasi.
   */
  async getTemplate(eventId: string): Promise<WaTemplateDTO> {
    const [row] = await db
      .select({
        id: waMessageTemplates.id,
        eventId: waMessageTemplates.eventId,
        templateText: waMessageTemplates.templateText,
        updatedAt: waMessageTemplates.updatedAt,
      })
      .from(waMessageTemplates)
      .where(eq(waMessageTemplates.eventId, eventId))
      .limit(1);

    if (row) {
      return {
        id: row.id,
        eventId: row.eventId,
        templateText: row.templateText,
        updatedAt: row.updatedAt.toISOString(),
        isCustom: true,
      };
    }

    return {
      eventId,
      templateText: DEFAULT_WA_MESSAGE_TEMPLATE,
      updatedAt: new Date().toISOString(),
      isCustom: false,
    };
  }

  /**
   * Menyimpan template pesan WhatsApp kustom Host (Upsert).
   */
  async updateTemplate(
    eventId: string,
    templateText: string
  ): Promise<WaTemplateDTO> {
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    const [saved] = await db
      .insert(waMessageTemplates)
      .values({
        eventId,
        templateText,
      })
      .onConflictDoUpdate({
        target: waMessageTemplates.eventId,
        set: {
          templateText,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      id: saved.id,
      eventId: saved.eventId,
      templateText: saved.templateText,
      updatedAt: saved.updatedAt.toISOString(),
      isCustom: true,
    };
  }

  /**
   * Menghasilkan tautan wa.me dengan teks pesan terisi (TDD §5.2.B.4 & §11.5).
   * Mensubstitusi variabel: {nama}, {acara}, {tanggal}, {link}.
   */
  async generateWhatsAppLink(
    eventId: string,
    guestId: string
  ): Promise<WhatsAppLinkDTO> {
    const [guest] = await db
      .select({
        id: guests.id,
        name: guests.name,
        phoneNumber: guests.phoneNumber,
        token: guests.token,
      })
      .from(guests)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
      .limit(1);

    if (!guest) {
      throw new NotFoundError('Tamu tidak ditemukan');
    }

    if (!guest.phoneNumber?.trim()) {
      throw new BadRequestError(
        'PHONE_REQUIRED',
        'Tamu belum memiliki nomor WhatsApp'
      );
    }

    const normalizedPhone = normalizeWhatsAppNumber(guest.phoneNumber);

    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        eventDate: events.eventDate,
        timeZone: events.timeZone,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    const templateDto = await this.getTemplate(eventId);
    const templateText = templateDto.templateText;

    const formattedDate = event.eventDate
      ? formatEventDateTime(
          event.eventDate.toISOString(),
          (event.timeZone as IndonesiaTimeZone) || 'Asia/Jakarta',
          false
        )
      : '';

    const baseUrl = process.env.INVITATION_APP_URL || 'https://inveeta.com';
    const invitationUrl = `${baseUrl.replace(/\/$/, '')}/${event.slug}/${guest.token}`;

    const rawMessage = templateText
      .replaceAll('{nama}', guest.name)
      .replaceAll('[NAMA_TAMU]', guest.name)
      .replaceAll('{acara}', event.title)
      .replaceAll('[ACARA]', event.title)
      .replaceAll('{tanggal}', formattedDate)
      .replaceAll('[TANGGAL]', formattedDate)
      .replaceAll('{link}', invitationUrl)
      .replaceAll('[LINK_UNDANGAN]', invitationUrl);

    const encodedUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(rawMessage)}`;

    return {
      phoneNumber: normalizedPhone,
      rawMessage,
      encodedUrl,
    };
  }
}

export const whatsAppService = new WhatsAppService();
