import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { generateId } from '@inveeta/shared';
import { events, eventSessions } from './events.js';

export const guests = pgTable(
  'guests',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phoneNumber: text('phone_number'),
    category: text('category', { enum: ['vip', 'family', 'regular'] })
      .default('regular')
      .notNull(),
    maxPax: integer('max_pax').default(1).notNull(),
    token: text('token').notNull(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    checkInSessionId: text('check_in_session_id').references(
      () => eventSessions.id,
      { onDelete: 'set null' }
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('guests_token_unique_idx').on(table.token),
    index('guests_event_id_idx').on(table.eventId),
    index('guests_check_in_session_id_idx').on(table.checkInSessionId),
    check('guests_max_pax_positive_check', sql`${table.maxPax} > 0`),
  ]
);

export const guestSessionAllocations = pgTable(
  'guest_session_allocations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    guestId: text('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    eventSessionId: text('event_session_id')
      .notNull()
      .references(() => eventSessions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('guest_session_allocations_unique_idx').on(
      table.guestId,
      table.eventSessionId
    ),
    index('guest_session_allocations_guest_idx').on(table.guestId),
    index('guest_session_allocations_session_idx').on(table.eventSessionId),
  ]
);

export const rsvps = pgTable(
  'rsvps',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    guestId: text('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    eventSessionId: text('event_session_id')
      .notNull()
      .references(() => eventSessions.id, { onDelete: 'cascade' }),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['attending', 'declined', 'pending'],
    }).notNull(),
    actualPax: integer('actual_pax').default(0).notNull(),
    notes: text('notes'),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    isManualOverride: boolean('is_manual_override').default(false).notNull(),
    overrideNotes: text('override_notes'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('rsvps_guest_session_unique_idx').on(
      table.guestId,
      table.eventSessionId
    ),
    index('rsvps_event_id_idx').on(table.eventId),
    index('rsvps_session_id_idx').on(table.eventSessionId),
    check('rsvps_actual_pax_check', sql`${table.actualPax} >= 0`),
    check(
      'rsvps_status_pax_consistency_check',
      sql`(${table.status} = 'attending' AND ${table.actualPax} > 0) OR (${table.status} = 'declined' AND ${table.actualPax} = 0) OR (${table.status} = 'pending' AND ${table.actualPax} = 0)`
    ),
  ]
);

export const guestsRelations = relations(guests, ({ one, many }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id],
  }),
  checkInSession: one(eventSessions, {
    fields: [guests.checkInSessionId],
    references: [eventSessions.id],
  }),
  allocations: many(guestSessionAllocations),
  rsvps: many(rsvps),
}));

export const guestSessionAllocationsRelations = relations(
  guestSessionAllocations,
  ({ one }) => ({
    guest: one(guests, {
      fields: [guestSessionAllocations.guestId],
      references: [guests.id],
    }),
    session: one(eventSessions, {
      fields: [guestSessionAllocations.eventSessionId],
      references: [eventSessions.id],
    }),
  })
);

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  guest: one(guests, {
    fields: [rsvps.guestId],
    references: [guests.id],
  }),
  session: one(eventSessions, {
    fields: [rsvps.eventSessionId],
    references: [eventSessions.id],
  }),
  event: one(events, {
    fields: [rsvps.eventId],
    references: [events.id],
  }),
}));
