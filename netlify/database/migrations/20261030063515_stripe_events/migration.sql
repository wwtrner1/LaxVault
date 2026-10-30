CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY,
	"type" text NOT NULL,
	"received_at" timestamp DEFAULT now()
);
