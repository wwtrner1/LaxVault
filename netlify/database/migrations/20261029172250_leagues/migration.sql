CREATE TABLE "league_members" (
	"member_id" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"owner_id" text PRIMARY KEY,
	"name" text DEFAULT '' NOT NULL,
	"subscription_id" text,
	"seats" integer DEFAULT 15 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "league_members_owner_idx" ON "league_members" ("owner_id");