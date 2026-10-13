import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { generateId } from '@inveeta/shared';
import { events } from './events.js';
import { guests } from './guests.js';

export const wishes = pgTable(
  'wishes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    guestId: text('guest_id').references(() => guests.id, {
      onDelete: 'set null',
    }),
    senderName: text('sender_name').notNull(),
    message: text('message').notNull(),
    isHidden: boolean('is_hidden').default(false).notNull(),
    ipHash: text('ip_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('wishes_event_id_created_at_idx').on(table.eventId, table.createdAt),
  ]
);

export const eventMedia = pgTable(
  'event_media',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    mediaType: text('media_type', {
      enum: ['photo', 'audio', 'qris', 'og_image'],
    }).notNull(),
    fileKey: text('file_key').notNull(),
    fileUrl: text('file_url').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    slotIdentifier: text('slot_identifier'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('event_media_event_id_idx').on(table.eventId)]
);

export const eventGiftDetails = pgTable(
  'event_gift_details',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    eventId: text('event_id')
      .notNull()
      .unique()
      .references(() => events.id, { onDelete: 'cascade' }),
    qrisImageUrl: text('qris_image_url'),
    giftAddress: text('gift_address'),
    giftRecipientName: text('gift_recipient_name'),
    bankAccounts: jsonb('bank_accounts')
      .$type<
        Array<{
          id: string;
          bankName: string;
          accountNumber: string;
          accountHolder: string;
          sortOrder: number;
        }>
      >()
      .default([])
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('event_gift_details_event_id_unique_idx').on(table.eventId),
  ]
);

export const waMessageTemplates = pgTable(
  'wa_message_templates',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    eventId: text('event_id')
      .notNull()
      .unique()
      .references(() => events.id, { onDelete: 'cascade' }),
    templateText: text('template_text').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('wa_message_templates_event_id_unique_idx').on(table.eventId),
  ]
);

export const eventGiftDetailsRelations = relations(
  eventGiftDetails,
  ({ one }) => ({
    event: one(events, {
      fields: [eventGiftDetails.eventId],
      references: [events.id],
    }),
  })
);

export const eventMediaRelations = relations(eventMedia, ({ one }) => ({
  event: one(events, {
    fields: [eventMedia.eventId],
    references: [events.id],
  }),
}));

export const wishesRelations = relations(wishes, ({ one }) => ({
  event: one(events, {
    fields: [wishes.eventId],
    references: [events.id],
  }),
  guest: one(guests, {
    fields: [wishes.guestId],
    references: [guests.id],
  }),
}));

export const waMessageTemplatesRelations = relations(
  waMessageTemplates,
  ({ one }) => ({
    event: one(events, {
      fields: [waMessageTemplates.eventId],
      references: [events.id],
    }),
  })
);
