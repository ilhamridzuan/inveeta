import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { generateId } from '@inveeta/shared';
import { users } from './auth.js';
import { guests, guestSessionAllocations, rsvps } from './guests.js';
import {
  eventMedia,
  eventGiftDetails,
  wishes,
  waMessageTemplates,
} from './contents.js';

export const events = pgTable(
  'events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    hostId: text('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    brideName: text('bride_name'),
    groomName: text('groom_name'),
    brideNickname: text('bride_nickname'),
    groomNickname: text('groom_nickname'),
    brideParents: text('bride_parents'),
    groomParents: text('groom_parents'),
    eventDate: timestamp('event_date', { withTimezone: true }),
    timeZone: text('time_zone').default('Asia/Jakarta').notNull(),
    templateId: text('template_id').notNull(),
    templateTier: text('template_tier').default('free').notNull(),
    visualCustomization: jsonb('visual_customization').$type<{
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
      sectionsOrder?: string[];
      hiddenSections?: string[];
      coverLayout?: string;
    }>(),
    coverPhotoUrl: text('cover_photo_url'),
    bgMusicUrl: text('bg_music_url'),
    ogImageUrl: text('og_image_url'),
    quoteText: text('quote_text'),
    quoteSource: text('quote_source'),
    loveStory: jsonb('love_story').$type<
      Array<{ year: string; story: string; photoUrl?: string | null }>
    >(),
    rsvpDeadline: timestamp('rsvp_deadline', { withTimezone: true }),
    isPublished: boolean('is_published').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('events_slug_unique_idx').on(table.slug),
    index('events_host_id_idx').on(table.hostId),
  ]
);

export const eventSessions = pgTable(
  'event_sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    locationName: text('location_name').notNull(),
    address: text('address').notNull(),
    googleMapsUrl: text('google_maps_url'),
    wazeUrl: text('waze_url'),
    isPublic: boolean('is_public').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('event_sessions_event_id_idx').on(table.eventId)]
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(users, {
    fields: [events.hostId],
    references: [users.id],
  }),
  sessions: many(eventSessions),
  giftDetails: one(eventGiftDetails),
  media: many(eventMedia),
  guests: many(guests),
  wishes: many(wishes),
  waTemplate: one(waMessageTemplates),
}));

export const eventSessionsRelations = relations(
  eventSessions,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventSessions.eventId],
      references: [events.id],
    }),
    rsvps: many(rsvps),
    allocations: many(guestSessionAllocations),
  })
);
