CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"title" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"location_name" text NOT NULL,
	"address" text NOT NULL,
	"google_maps_url" text,
	"waze_url" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"bride_name" text,
	"groom_name" text,
	"bride_nickname" text,
	"groom_nickname" text,
	"bride_parents" text,
	"groom_parents" text,
	"event_date" timestamp with time zone,
	"time_zone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"template_id" text NOT NULL,
	"template_tier" text DEFAULT 'free' NOT NULL,
	"visual_customization" jsonb,
	"cover_photo_url" text,
	"bg_music_url" text,
	"og_image_url" text,
	"quote_text" text,
	"quote_source" text,
	"love_story" jsonb,
	"rsvp_deadline" timestamp with time zone,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_session_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"event_session_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"phone_number" text,
	"category" text DEFAULT 'regular' NOT NULL,
	"max_pax" integer DEFAULT 1 NOT NULL,
	"token" text NOT NULL,
	"checked_in_at" timestamp with time zone,
	"check_in_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_max_pax_positive_check" CHECK ("guests"."max_pax" > 0)
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"event_session_id" text NOT NULL,
	"event_id" text NOT NULL,
	"status" text NOT NULL,
	"actual_pax" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"override_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvps_actual_pax_check" CHECK ("rsvps"."actual_pax" >= 0),
	CONSTRAINT "rsvps_status_pax_consistency_check" CHECK (("rsvps"."status" = 'attending' AND "rsvps"."actual_pax" > 0) OR ("rsvps"."status" = 'declined' AND "rsvps"."actual_pax" = 0) OR ("rsvps"."status" = 'pending' AND "rsvps"."actual_pax" = 0))
);
--> statement-breakpoint
CREATE TABLE "event_gift_details" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"qris_image_url" text,
	"gift_address" text,
	"gift_recipient_name" text,
	"bank_accounts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_gift_details_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "event_media" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"media_type" text NOT NULL,
	"file_key" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"slot_identifier" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"template_text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wa_message_templates_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"guest_id" text,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_session_allocations" ADD CONSTRAINT "guest_session_allocations_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_session_allocations" ADD CONSTRAINT "guest_session_allocations_event_session_id_event_sessions_id_fk" FOREIGN KEY ("event_session_id") REFERENCES "public"."event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_check_in_session_id_event_sessions_id_fk" FOREIGN KEY ("check_in_session_id") REFERENCES "public"."event_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_session_id_event_sessions_id_fk" FOREIGN KEY ("event_session_id") REFERENCES "public"."event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_gift_details" ADD CONSTRAINT "event_gift_details_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_media" ADD CONSTRAINT "event_media_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_message_templates" ADD CONSTRAINT "wa_message_templates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "event_sessions_event_id_idx" ON "event_sessions" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_unique_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "events_host_id_idx" ON "events" USING btree ("host_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_session_allocations_unique_idx" ON "guest_session_allocations" USING btree ("guest_id","event_session_id");--> statement-breakpoint
CREATE INDEX "guest_session_allocations_guest_idx" ON "guest_session_allocations" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_session_allocations_session_idx" ON "guest_session_allocations" USING btree ("event_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_token_unique_idx" ON "guests" USING btree ("token");--> statement-breakpoint
CREATE INDEX "guests_event_id_idx" ON "guests" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "guests_check_in_session_id_idx" ON "guests" USING btree ("check_in_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_guest_session_unique_idx" ON "rsvps" USING btree ("guest_id","event_session_id");--> statement-breakpoint
CREATE INDEX "rsvps_event_id_idx" ON "rsvps" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rsvps_session_id_idx" ON "rsvps" USING btree ("event_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_gift_details_event_id_unique_idx" ON "event_gift_details" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_media_event_id_idx" ON "event_media" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wa_message_templates_event_id_unique_idx" ON "wa_message_templates" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "wishes_event_id_created_at_idx" ON "wishes" USING btree ("event_id","created_at");