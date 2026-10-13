import {
  db,
  events,
  eventSessions,
  eventGiftDetails,
  eventMedia,
} from '@inveeta/db';
import { eq, and, desc } from 'drizzle-orm';
import {
  generateId,
  isReservedSlug,
  getTemplate,
  DEFAULT_TEMPLATE_ID,
  type CreateDraftEventInput,
  type UpdateWizardStepInput,
  type SlugAvailabilityDTO,
  type PublishedEventResponseDTO,
} from '@inveeta/shared';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors.js';
import { triggerNextRevalidate } from '../../services/revalidation.js';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class EventsService {
  /**
   * Mengecek ketersediaan slug acara secara real-time.
   * Memvalidasi format karakter, kata kunci sistem terlarang, dan keunikan di basis data.
   */
  async checkSlugAvailability(slug: string): Promise<SlugAvailabilityDTO> {
    const normalizedSlug = slug.toLowerCase().trim();

    if (!SLUG_REGEX.test(normalizedSlug)) {
      return {
        slug: normalizedSlug,
        isAvailable: false,
        reason: 'INVALID_FORMAT',
      };
    }

    if (isReservedSlug(normalizedSlug)) {
      return {
        slug: normalizedSlug,
        isAvailable: false,
        reason: 'RESERVED_KEYWORD',
      };
    }

    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, normalizedSlug))
      .limit(1);

    if (existing) {
      return {
        slug: normalizedSlug,
        isAvailable: false,
        reason: 'ALREADY_TAKEN',
      };
    }

    return {
      slug: normalizedSlug,
      isAvailable: true,
    };
  }

  /**
   * Menginisiasi acara baru berstatus draft (isPublished = false).
   */
  async createDraftEvent(hostId: string, input: CreateDraftEventInput) {
    const slugCheck = await this.checkSlugAvailability(input.slug);
    if (!slugCheck.isAvailable) {
      if (slugCheck.reason === 'ALREADY_TAKEN') {
        throw new ConflictError(
          `Slug '${input.slug}' sudah digunakan oleh acara lain. Silakan pilih slug lain.`
        );
      }
      throw new BadRequestError(
        'INVALID_SLUG',
        `Slug '${input.slug}' tidak diizinkan atau menggunakan format yang salah.`
      );
    }

    const template = getTemplate(input.templateId) || getTemplate(DEFAULT_TEMPLATE_ID);
    const templateId = template?.id ?? DEFAULT_TEMPLATE_ID;
    const templateTier = template?.tier ?? 'free';
    const visualCustomization = template?.defaultCustomization ?? {
      primaryColor: '#2D3748',
      secondaryColor: '#E2D9D2',
      fontFamily: 'playfair-inter',
      coverLayout: 'fullscreen-image',
      sectionsOrder: ['cover', 'couple', 'sessions', 'rsvp'],
      hiddenSections: [],
    };

    const [newEvent] = await db
      .insert(events)
      .values({
        hostId,
        slug: input.slug.toLowerCase().trim(),
        title: input.title,
        timeZone: input.timeZone,
        templateId,
        templateTier,
        visualCustomization,
        isPublished: false,
      })
      .returning();

    return newEvent;
  }

  /**
   * Memperbarui data acara secara bertahap sesuai langkah wizard (Step 1 - 5).
   */
  async updateWizardStep(
    hostId: string,
    eventId: string,
    input: UpdateWizardStepInput
  ) {
    const [existingEvent] = await db
      .select({
        id: events.id,
        hostId: events.hostId,
        slug: events.slug,
        isPublished: events.isPublished,
      })
      .from(events)
      .where(eq(events.id, eventId));

    if (!existingEvent) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    if (existingEvent.hostId !== hostId) {
      throw new ForbiddenError(
        'Anda tidak memiliki izin untuk memodifikasi acara ini'
      );
    }

    switch (input.step) {
      case 1: {
        const { data } = input;
        const normalizedSlug = data.slug.toLowerCase().trim();

        // Validasi slug jika berubah
        if (normalizedSlug !== existingEvent.slug) {
          if (existingEvent.isPublished) {
            throw new BadRequestError(
              'SLUG_IMMUTABLE',
              'Slug acara yang sudah dipublikasikan tidak dapat diubah.'
            );
          }

          const availability = await this.checkSlugAvailability(normalizedSlug);
          if (!availability.isAvailable) {
            throw new ConflictError(
              `Slug '${normalizedSlug}' tidak tersedia (${availability.reason}).`
            );
          }
        }

        await db
          .update(events)
          .set({
            title: data.title,
            slug: normalizedSlug,
            timeZone: data.timeZone,
            eventDate: data.eventDate ? new Date(data.eventDate) : null,
            rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline) : null,
          })
          .where(eq(events.id, eventId));
        break;
      }

      case 2: {
        const { data } = input;
        await db.transaction(async (tx) => {
          // Ganti daftar sesi acara secara atomik
          await tx.delete(eventSessions).where(eq(eventSessions.eventId, eventId));

          await tx.insert(eventSessions).values(
            data.sessions.map((s, index) => ({
              id: s.id || generateId(),
              eventId,
              title: s.title,
              startTime: new Date(s.startTime),
              endTime: new Date(s.endTime),
              locationName: s.locationName,
              address: s.address,
              googleMapsUrl: s.googleMapsUrl || null,
              wazeUrl: s.wazeUrl || null,
              isPublic: s.isPublic,
              sortOrder: s.sortOrder ?? index,
            }))
          );
        });
        break;
      }

      case 3: {
        const { data } = input;
        await db
          .update(events)
          .set({
            brideName: data.brideName,
            brideNickname: data.brideNickname,
            brideParents: data.brideParents || null,
            groomName: data.groomName,
            groomNickname: data.groomNickname,
            groomParents: data.groomParents || null,
            quoteText: data.quoteText || null,
            quoteSource: data.quoteSource || null,
            loveStory: data.loveStory || [],
          })
          .where(eq(events.id, eventId));
        break;
      }

      case 4: {
        const { data } = input;
        await db.transaction(async (tx) => {
          await tx
            .update(events)
            .set({
              coverPhotoUrl: data.coverPhotoUrl || null,
              bgMusicUrl: data.bgMusicUrl || null,
            })
            .where(eq(events.id, eventId));

          // Upsert rekening dan amplop digital
          await tx
            .insert(eventGiftDetails)
            .values({
              eventId,
              qrisImageUrl: data.qrisImageUrl || null,
              giftAddress: data.giftAddress || null,
              giftRecipientName: data.giftRecipientName || null,
              bankAccounts: data.bankAccounts.map((b, index) => ({
                id: b.id || generateId(),
                bankName: b.bankName,
                accountNumber: b.accountNumber,
                accountHolder: b.accountHolder,
                sortOrder: b.sortOrder ?? index,
              })),
            })
            .onConflictDoUpdate({
              target: eventGiftDetails.eventId,
              set: {
                qrisImageUrl: data.qrisImageUrl || null,
                giftAddress: data.giftAddress || null,
                giftRecipientName: data.giftRecipientName || null,
                bankAccounts: data.bankAccounts.map((b, index) => ({
                  id: b.id || generateId(),
                  bankName: b.bankName,
                  accountNumber: b.accountNumber,
                  accountHolder: b.accountHolder,
                  sortOrder: b.sortOrder ?? index,
                })),
                updatedAt: new Date(),
              },
            });
        });
        break;
      }

      case 5: {
        const { data } = input;
        const template = getTemplate(data.templateId);
        await db
          .update(events)
          .set({
            templateId: data.templateId,
            templateTier: template?.tier ?? 'free',
            visualCustomization: data.visualCustomization,
          })
          .where(eq(events.id, eventId));
        break;
      }
    }

    return this.getEventById(hostId, eventId);
  }

  /**
   * Finalisasi dan mempublikasikan acara.
   * Memvalidasi prasyarat publikasi dan mengunci status acara.
   */
  async publishEvent(
    hostId: string,
    eventId: string
  ): Promise<PublishedEventResponseDTO> {
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hostId, hostId)));

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    // Ambil sesi acara
    const sessions = await db
      .select({ id: eventSessions.id })
      .from(eventSessions)
      .where(eq(eventSessions.eventId, eventId));

    // Validasi prasyarat kelengkapan publikasi (TDD §11.1)
    if (sessions.length === 0) {
      throw new BadRequestError(
        'MISSING_SESSIONS',
        'Acara harus memiliki minimal satu sesi acara sebelum dapat dipublikasikan.'
      );
    }

    if (!event.brideName || !event.groomName) {
      throw new BadRequestError(
        'MISSING_COUPLE_NAMES',
        'Nama kedua mempelai wajib diisi sebelum publikasi.'
      );
    }

    if (!event.eventDate || !event.rsvpDeadline) {
      throw new BadRequestError(
        'MISSING_EVENT_DATES',
        'Tanggal acara dan batas waktu konfirmasi RSVP wajib diisi sebelum publikasi.'
      );
    }

    // Set isPublished = true
    await db
      .update(events)
      .set({
        isPublished: true,
      })
      .where(eq(events.id, eventId));

    // Pemicu webhook revalidasi Next.js ISR di latar belakang
    void triggerNextRevalidate(event.slug);

    return {
      id: event.id,
      slug: event.slug,
      isPublished: true,
      publishedAt: new Date().toISOString(),
      invitationUrl: `https://inveeta.com/${event.slug}`,
    };
  }

  /**
   * Mengambil detail acara lengkap beserta relasi sesi, amplop, dan media milik Host.
   */
  async getEventById(hostId: string, eventId: string) {
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hostId, hostId)));

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    const sessions = await db
      .select()
      .from(eventSessions)
      .where(eq(eventSessions.eventId, eventId))
      .orderBy(eventSessions.sortOrder);

    const [giftDetails] = await db
      .select()
      .from(eventGiftDetails)
      .where(eq(eventGiftDetails.eventId, eventId));

    const mediaList = await db
      .select()
      .from(eventMedia)
      .where(eq(eventMedia.eventId, eventId))
      .orderBy(eventMedia.sortOrder);

    return {
      ...event,
      sessions,
      giftDetails: giftDetails || null,
      media: mediaList,
    };
  }

  /**
   * Mengambil daftar seluruh acara yang dimiliki oleh Host.
   */
  async getHostEvents(hostId: string) {
    return await db
      .select()
      .from(events)
      .where(eq(events.hostId, hostId))
      .orderBy(desc(events.createdAt));
  }
}

export const eventsService = new EventsService();
