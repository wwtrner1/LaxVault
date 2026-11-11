CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text,
	"email" text DEFAULT '' NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"rating" integer,
	"note" text NOT NULL,
	"page" text DEFAULT '' NOT NULL,
	"at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "feedback_at_idx" ON "feedback" ("at");