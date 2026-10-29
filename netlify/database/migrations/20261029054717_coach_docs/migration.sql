CREATE TABLE "coach_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"day" text NOT NULL,
	"kind" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "depth_charts" DROP CONSTRAINT "depth_charts_team_id_teams_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_events" DROP CONSTRAINT "hub_events_org_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_events" DROP CONSTRAINT "hub_events_team_id_teams_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_files" DROP CONSTRAINT "hub_files_org_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_files" DROP CONSTRAINT "hub_files_folder_id_hub_folders_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_folders" DROP CONSTRAINT "hub_folders_org_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_folders" DROP CONSTRAINT "hub_folders_team_id_teams_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_messages" DROP CONSTRAINT "hub_messages_org_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "hub_messages" DROP CONSTRAINT "hub_messages_team_id_teams_id_fkey";--> statement-breakpoint
ALTER TABLE "org_members" DROP CONSTRAINT "org_members_org_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "org_shares" DROP CONSTRAINT "org_shares_org_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "quiz_results" DROP CONSTRAINT "quiz_results_share_id_playbook_shares_id_fkey";--> statement-breakpoint
ALTER TABLE "team_players" DROP CONSTRAINT "team_players_team_id_teams_id_fkey";--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_org_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "text_signups" DROP CONSTRAINT "text_signups_team_id_teams_id_fkey";--> statement-breakpoint
DROP TABLE "ai_usage";--> statement-breakpoint
DROP TABLE "call_sheets";--> statement-breakpoint
DROP TABLE "depth_charts";--> statement-breakpoint
DROP TABLE "hub_events";--> statement-breakpoint
DROP TABLE "hub_files";--> statement-breakpoint
DROP TABLE "hub_folders";--> statement-breakpoint
DROP TABLE "hub_messages";--> statement-breakpoint
DROP TABLE "my_teams";--> statement-breakpoint
DROP TABLE "org_members";--> statement-breakpoint
DROP TABLE "org_shares";--> statement-breakpoint
DROP TABLE "organizations";--> statement-breakpoint
DROP TABLE "playbook_shares";--> statement-breakpoint
DROP TABLE "quiz_results";--> statement-breakpoint
DROP TABLE "team_players";--> statement-breakpoint
DROP TABLE "teams";--> statement-breakpoint
DROP TABLE "text_signups";--> statement-breakpoint
CREATE UNIQUE INDEX "coach_docs_owner_kind_idx" ON "coach_docs" ("owner_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_usage_owner_day_kind_idx" ON "daily_usage" ("owner_id","day","kind");