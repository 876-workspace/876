-- Conferencing link for a calendar event. Additive and nullable: existing rows
-- keep a NULL meeting_url, which every reader already treats as "no link".

ALTER TABLE "work_events" ADD COLUMN "meeting_url" TEXT;
