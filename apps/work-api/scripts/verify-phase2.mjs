#!/usr/bin/env node
import { config } from 'dotenv'
import pg from 'pg'

config({ path: ['.env.development.local', '.env.development', '.env'] })

const { Pool } = pg
const workUrl =
  process.env.WORK_DIRECT_DATABASE_URL ?? process.env.WORK_DATABASE_URL

if (!workUrl)
  throw new Error('WORK_DATABASE_URL is required for Phase 2 verification.')

const work = new Pool({ connectionString: workUrl })

async function count(sql) {
  const result = await work.query(sql)
  return Number(result.rows[0]?.count ?? 0)
}

async function sample(sql) {
  const result = await work.query(sql)
  return result.rows.slice(0, 20)
}

async function check(name, sql, sampleSql = sql) {
  const failures = await count(`SELECT COUNT(*) AS count FROM (${sql}) q`)
  return {
    name,
    failures,
    sample: failures ? await sample(`${sampleSql} LIMIT 20`) : [],
  }
}

async function main() {
  const checks = await Promise.all([
    check(
      'tenant-default-task-list',
      `SELECT tenant.id
       FROM work_tenants tenant
       LEFT JOIN work_task_lists list
         ON list.tenant_id = tenant.id
        AND list.is_default = true
        AND list.deleted_at IS NULL
       GROUP BY tenant.id
       HAVING COUNT(list.id) <> 1`
    ),
    check(
      'task-list-reference',
      `SELECT task.id
       FROM work_tasks task
       LEFT JOIN work_task_lists list ON list.id = task.list_id
       WHERE list.id IS NULL OR list.tenant_id <> task.tenant_id`
    ),
    check(
      'task-uid',
      `SELECT id FROM work_tasks WHERE uid IS NULL OR btrim(uid) = ''`
    ),
    check(
      'task-timezone-pairs',
      `SELECT id FROM work_tasks
       WHERE (start_at IS NULL) <> (start_time_zone IS NULL)
          OR (due_at IS NULL) <> (due_time_zone IS NULL)`
    ),
    check(
      'task-time-order',
      `SELECT id FROM work_tasks
       WHERE start_at IS NOT NULL AND due_at IS NOT NULL AND due_at < start_at`
    ),
    check(
      'task-percent-complete',
      `SELECT id FROM work_tasks WHERE percent_complete < 0 OR percent_complete > 100`
    ),
    check(
      'legacy-context-link-backfill',
      `SELECT task.id
       FROM work_tasks task
       WHERE task.context_service IS NOT NULL
         AND task.context_resource IS NOT NULL
         AND task.context_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM work_task_links link
           WHERE link.task_id = task.id
             AND link.service = task.context_service
             AND link.resource = task.context_resource
             AND link.external_id = task.context_id
             AND link.is_primary = true
         )`
    ),
    check(
      'legacy-assignee-backfill',
      `SELECT task.id
       FROM work_tasks task
       WHERE task.assignee_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM work_task_assignments assignment
           WHERE assignment.task_id = task.id
             AND assignment.target_type = 'USER'
             AND assignment.assignee_id = task.assignee_id
             AND assignment.role = 'OWNER'
         )`
    ),
    check(
      'primary-calendar-owner',
      `SELECT id FROM work_calendars
       WHERE is_primary = true AND owner_user_id IS NULL`
    ),
    check(
      'primary-calendar-owner-subscription',
      `SELECT calendar.id
       FROM work_calendars calendar
       WHERE calendar.is_primary = true
         AND calendar.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1
           FROM work_calendar_subscriptions subscription
           WHERE subscription.calendar_id = calendar.id
             AND subscription.user_id = calendar.owner_user_id
             AND subscription.role = 'OWNER'
         )`
    ),
    check(
      'event-time-shape',
      `SELECT id FROM work_events
       WHERE NOT (
         (start_at IS NOT NULL AND end_at IS NOT NULL AND time_zone IS NOT NULL
          AND start_date IS NULL AND end_date IS NULL)
         OR
         (start_at IS NULL AND end_at IS NULL AND time_zone IS NULL
          AND start_date IS NOT NULL AND end_date IS NOT NULL)
       )`
    ),
    check(
      'event-time-order',
      `SELECT id FROM work_events
       WHERE (start_at IS NOT NULL AND end_at <= start_at)
          OR (start_date IS NOT NULL AND end_date <= start_date)`
    ),
    check(
      'participant-identity-shape',
      `SELECT id FROM work_event_participants
       WHERE NOT (
         (kind = 'USER' AND participant_id IS NOT NULL AND email IS NULL)
         OR
         (kind = 'EMAIL' AND participant_id IS NULL AND email IS NOT NULL)
       )`
    ),
    check(
      'alert-parent-shape',
      `SELECT id FROM work_alerts
       WHERE ((task_id IS NOT NULL)::int + (event_id IS NOT NULL)::int) <> 1`
    ),
    check(
      'alert-trigger-shape',
      `SELECT id FROM work_alerts
       WHERE NOT (
         (trigger_type = 'ABSOLUTE' AND trigger_at IS NOT NULL AND offset_seconds IS NULL)
         OR
         (trigger_type = 'RELATIVE' AND trigger_at IS NULL AND offset_seconds IS NOT NULL)
       )`
    ),
    check(
      'recurrence-count-until',
      `SELECT id FROM work_recurrence_rules
       WHERE count IS NOT NULL AND until_at IS NOT NULL`
    ),
    check(
      'outbox-occurrence-key',
      `SELECT id FROM work_notification_outbox
       WHERE occurrence_key IS NULL OR btrim(occurrence_key) = ''`
    ),
    check(
      'sync-credential-inline-secret-guard',
      `SELECT id FROM work_sync_connections
       WHERE credential_ref IS NOT NULL
         AND (
           credential_ref LIKE 'ya29.%'
           OR credential_ref LIKE 'eyJ%'
           OR credential_ref LIKE 'Bearer %'
         )`
    ),
  ])

  const report = {
    object: 'work_phase2_verification',
    checks,
    totalFailures: checks.reduce((sum, item) => sum + item.failures, 0),
  }

  console.info(JSON.stringify(report, null, 2))
  if (report.totalFailures > 0) process.exitCode = 1
}

try {
  await main()
} finally {
  await work.end()
}
