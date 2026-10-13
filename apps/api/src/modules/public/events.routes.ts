import { Hono } from 'hono';
import {
  db,
  events,
  eventSessions,
  eventGiftDetails,
  eventMedia,
  guests,
  guestSessionAllocations,
  rsvps,
} from '@inveeta/db';
import { eq, and } from 'drizzle-orm';
import type {
  PublicEventDTO,
  PublicSessionItem,
  PersonalizedGuestContextDTO,
  AllocatedSessionDTO,
  EventGiftDetails,
  TemplateTier,
  IndonesiaTimeZone,
  GuestCategory,
  RsvpStatus,
  VisualCustomization,
} from '@inveeta/shared';
import { NotFoundError } from '../../utils/errors.js';
import { eventsService } from '../events/service.js';

const EVENT_NOT_FOUND_MSG = 'Acara tidak ditemukan';

function formatGiftDetails(
  gift: typeof eventGiftDetails.$inferSelect | undefined
): EventGiftDetails | null {
  if (!gift) return null;
  return {
    qrisImageUrl: gift.qrisImageUrl ?? null,
    giftAddress: gift.giftAddress ?? null,
    giftRecipientName: gift.giftRecipientName ?? null,
    bankAccounts: (gift.bankAccounts || []).map((account, index) => ({
      id: account.id,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolder: account.accountHolder,
      sortOrder: account.sortOrder ?? index,
    })),
  };
}

function formatPublicSessions(
  sessionList: Array<typeof eventSessions.$inferSelect>
): PublicSessionItem[] {
  return sessionList.map((session) => ({
    id: session.id,
    title: session.title,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    locationName: session.locationName,
    address: session.address,
    googleMapsUrl: session.googleMapsUrl ?? null,
    wazeUrl: session.wazeUrl ?? null,
    isPublic: session.isPublic,
  }));
}

function buildPublicEventDTO(
  event: typeof events.$inferSelect,
  gift: typeof eventGiftDetails.$inferSelect | undefined,
  mediaList: Array<typeof eventMedia.$inferSelect>,
  sessionList: Array<typeof eventSessions.$inferSelect>
): PublicEventDTO {
  const defaultVisual: VisualCustomization = {
    primaryColor: '#2D3748',
    secondaryColor: '#E2D9D2',
    fontFamily: 'playfair-inter',
    coverLayout: 'fullscreen-image',
    sectionsOrder: ['cover', 'couple', 'sessions', 'rsvp'],
    hiddenSections: [],
  };

  const rawVisual = event.visualCustomization as Partial<VisualCustomization> | null;
  const visualCustomization: VisualCustomization = {
    primaryColor: rawVisual?.primaryColor ?? defaultVisual.primaryColor,
    secondaryColor: rawVisual?.secondaryColor ?? defaultVisual.secondaryColor,
    fontFamily: rawVisual?.fontFamily ?? defaultVisual.fontFamily,
    coverLayout: rawVisual?.coverLayout ?? defaultVisual.coverLayout,
    sectionsOrder: rawVisual?.sectionsOrder ?? defaultVisual.sectionsOrder,
    hiddenSections: rawVisual?.hiddenSections ?? defaultVisual.hiddenSections,
  };

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    eventType: 'wedding',
    templateId: event.templateId,
    templateTier: (event.templateTier || 'free') as TemplateTier,
    visualCustomization,
    eventDate: event.eventDate ? event.eventDate.toISOString() : '',
    timeZone: (event.timeZone || 'Asia/Jakarta') as IndonesiaTimeZone,
    rsvpDeadline: event.rsvpDeadline ? event.rsvpDeadline.toISOString() : '',
    isPublished: event.isPublished,
    ogImageUrl: event.ogImageUrl ?? null,
    groomName: event.groomName ?? null,
    groomNickname: event.groomNickname ?? null,
    groomParents: event.groomParents ?? null,
    brideName: event.brideName ?? null,
    brideNickname: event.brideNickname ?? null,
    brideParents: event.brideParents ?? null,
    quoteText: event.quoteText ?? null,
    quoteSource: event.quoteSource ?? null,
    loveStory: (event.loveStory || []).map((story) => ({
      year: story.year,
      story: story.story,
      photoUrl: story.photoUrl ?? undefined,
    })),
    giftDetails: formatGiftDetails(gift),
    media: mediaList.map((m) => ({
      id: m.id,
      mediaType: m.mediaType as 'photo' | 'audio' | 'qris' | 'og_image',
      fileUrl: m.fileUrl,
      slotIdentifier: m.slotIdentifier ?? null,
      sortOrder: m.sortOrder,
    })),
    sessions: formatPublicSessions(sessionList),
  };
}

function buildGuestContextDTO(
  guest: typeof guests.$inferSelect,
  event: Pick<typeof events.$inferSelect, 'rsvpDeadline'>,
  allocatedRows: Array<{
    sessionId: string;
    sessionTitle: string;
    startTime: Date;
    endTime: Date;
    locationName: string;
    address: string;
    googleMapsUrl: string | null;
  }>,
  guestRsvps: Array<typeof rsvps.$inferSelect>
): PersonalizedGuestContextDTO {
  const rsvpMap = new Map(guestRsvps.map((r) => [r.eventSessionId, r]));

  const isDeadlinePassed = event.rsvpDeadline
    ? new Date() > new Date(event.rsvpDeadline)
    : false;
  const hasHostOverride = guestRsvps.some((r) => r.isManualOverride);
  const isRsvpLocked = isDeadlinePassed || hasHostOverride;

  let lockReason: 'DEADLINE_PASSED' | 'HOST_OVERRIDE' | null = null;
  if (isDeadlinePassed) {
    lockReason = 'DEADLINE_PASSED';
  } else if (hasHostOverride) {
    lockReason = 'HOST_OVERRIDE';
  }

  const allocatedSessions: AllocatedSessionDTO[] = allocatedRows.map((session) => {
    const existingRsvp = rsvpMap.get(session.sessionId);
    return {
      sessionId: session.sessionId,
      sessionTitle: session.sessionTitle,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      locationName: session.locationName,
      address: session.address,
      googleMapsUrl: session.googleMapsUrl ?? null,
      currentRsvp: existingRsvp
        ? {
            status: existingRsvp.status as RsvpStatus,
            actualPax: existingRsvp.actualPax,
            notes: existingRsvp.notes ?? null,
            isManualOverride: existingRsvp.isManualOverride,
            updatedAt: existingRsvp.updatedAt.toISOString(),
          }
        : null,
    };
  });

  return {
    guest: {
      id: guest.id,
      name: guest.name,
      category: guest.category as GuestCategory,
      maxPax: guest.maxPax,
      token: guest.token,
    },
    allocatedSessions,
    isRsvpLocked,
    lockReason,
  };
}

export const publicEventsRoutes = new Hono()
  /**
   * Cek ketersediaan slug acara
   * GET /api/v1/public/events/:slug/check
   */
  .get('/:slug/check', async (c) => {
    const slug = c.req.param('slug');
    const result = await eventsService.checkSlugAvailability(slug);
    return c.json({
      success: true,
      data: result,
    });
  })

  /**
   * Mengambil konteks personal tamu undangan via token
   * GET /api/v1/public/events/:slug/guests/:token
   */
  .get('/:slug/guests/:token', async (c) => {
    const slug = c.req.param('slug').toLowerCase().trim();
    const token = c.req.param('token').trim();

    const [event] = await db
      .select({
        id: events.id,
        rsvpDeadline: events.rsvpDeadline,
      })
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!event) {
      throw new NotFoundError(EVENT_NOT_FOUND_MSG);
    }

    const [guest] = await db
      .select()
      .from(guests)
      .where(and(eq(guests.eventId, event.id), eq(guests.token, token)))
      .limit(1);

    if (!guest) {
      throw new NotFoundError(
        'Tamu undangan tidak ditemukan atau tautan undangan tidak valid'
      );
    }

    const allocatedRows = await db
      .select({
        sessionId: eventSessions.id,
        sessionTitle: eventSessions.title,
        startTime: eventSessions.startTime,
        endTime: eventSessions.endTime,
        locationName: eventSessions.locationName,
        address: eventSessions.address,
        googleMapsUrl: eventSessions.googleMapsUrl,
      })
      .from(guestSessionAllocations)
      .innerJoin(
        eventSessions,
        eq(guestSessionAllocations.eventSessionId, eventSessions.id)
      )
      .where(eq(guestSessionAllocations.guestId, guest.id))
      .orderBy(eventSessions.sortOrder);

    const guestRsvps = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.guestId, guest.id));

    const guestContext = buildGuestContextDTO(
      guest,
      event,
      allocatedRows,
      guestRsvps
    );

    return c.json({
      success: true,
      data: guestContext,
    });
  })

  /**
   * Mengambil data publik acara (Zero PII, hanya sesi isPublic = true)
   * GET /api/v1/public/events/:slug
   */
  .get('/:slug', async (c) => {
    const slug = c.req.param('slug').toLowerCase().trim();

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!event) {
      throw new NotFoundError(EVENT_NOT_FOUND_MSG);
    }

    const [gift] = await db
      .select()
      .from(eventGiftDetails)
      .where(eq(eventGiftDetails.eventId, event.id))
      .limit(1);

    const mediaList = await db
      .select()
      .from(eventMedia)
      .where(eq(eventMedia.eventId, event.id))
      .orderBy(eventMedia.sortOrder);

    const publicSessionList = await db
      .select()
      .from(eventSessions)
      .where(
        and(eq(eventSessions.eventId, event.id), eq(eventSessions.isPublic, true))
      )
      .orderBy(eventSessions.sortOrder);

    const publicEvent = buildPublicEventDTO(
      event,
      gift,
      mediaList,
      publicSessionList
    );

    return c.json({
      success: true,
      data: publicEvent,
    });
  });
