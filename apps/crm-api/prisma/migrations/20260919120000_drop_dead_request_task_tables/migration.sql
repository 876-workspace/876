-- CRM request tasks and reminders moved to the Work service
-- (docs/architecture/019-work-service-and-productivity-plane.md). Nothing in
-- crm-api reads or writes these tables, so they and their dedicated enums go.
DROP TABLE IF EXISTS "crm_request_tasks";
DROP TABLE IF EXISTS "crm_request_reminders";
DROP TYPE IF EXISTS "TaskStatus";
DROP TYPE IF EXISTS "ReminderStatus";
