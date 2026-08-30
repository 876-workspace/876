#!/usr/bin/env node
import { randomUUID } from 'node:crypto'

import { config } from 'dotenv'
import pg from 'pg'

config({ path: ['.env.development.local', '.env.development', '.env'] })

const { Pool } = pg
const crmUrl = process.env.CRM_DIRECT_DATABASE_URL ?? process.env.CRM_DATABASE_URL
const workUrl =
  process.env.WORK_DIRECT_DATABASE_URL ?? process.env.WORK_DATABASE_URL

if (!crmUrl) throw new Error('CRM_DATABASE_URL is required for CRM migration.')
if (!workUrl) throw new Error('WORK_DATABASE_URL is required for CRM migration.')

const crm = new Pool({ connectionString: crmUrl })
const work = new Pool({ connectionString: workUrl })

async function ensureWorkTenant(source) {
  const proposedId = `work_tnt_${randomUUID().replaceAll('-', '')}`
  const result = await work.query(
    `INSERT INTO work_tenants
      (id, organization_id, status, created_at, updated_at)
     VALUES ($1, $2, $3::"WorkTenantStatus", $4, $5)
     ON CONFLICT (organization_id) DO UPDATE SET
       status = EXCLUDED.status,
       updated_at = GREATEST(work_tenants.updated_at, EXCLUDED.updated_at)
     RETURNING id`,
    [
      proposedId,
      source.organization_id,
      source.status,
      source.created_at,
      source.updated_at,
    ]
  )
  return result.rows[0].id
}

async function copyTasks(tenantMap) {
  const source = await crm.query(`
    SELECT id, tenant_id, request_id, title, description, status, priority_id,
           assignee_id, due_at, completed_at, completed_by, sort_order,
           created_by, created_at, updated_at, deleted_at, deleted_by
    FROM crm_request_tasks
    ORDER BY created_at, id
  `)

  for (const row of source.rows) {
    const tenantId = tenantMap.get(row.tenant_id)
    if (!tenantId)
      throw new Error(`No Work tenant mapping for CRM tenant ${row.tenant_id}`)

    await work.query(
      `INSERT INTO work_tasks
        (id, tenant_id, context_service, context_resource, context_id,
         title, description, status, priority_id, assignee_id, due_at,
         completed_at, completed_by, sort_order, created_by, created_at,
         updated_at, deleted_at, deleted_by)
       VALUES
        ($1, $2, 'crm', 'request', $3, $4, $5, $6::"WorkTaskStatus", $7,
         $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         context_service = EXCLUDED.context_service,
         context_resource = EXCLUDED.context_resource,
         context_id = EXCLUDED.context_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         priority_id = EXCLUDED.priority_id,
         assignee_id = EXCLUDED.assignee_id,
         due_at = EXCLUDED.due_at,
         completed_at = EXCLUDED.completed_at,
         completed_by = EXCLUDED.completed_by,
         sort_order = EXCLUDED.sort_order,
         created_by = EXCLUDED.created_by,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at,
         deleted_by = EXCLUDED.deleted_by`,
      [
        row.id,
        tenantId,
        row.request_id,
        row.title,
        row.description,
        row.status,
        row.priority_id,
        row.assignee_id,
        row.due_at,
        row.completed_at,
        row.completed_by,
        row.sort_order,
        row.created_by,
        row.created_at,
        row.updated_at,
        row.deleted_at,
        row.deleted_by,
      ]
    )
  }

  return source.rowCount ?? source.rows.length
}

async function copyReminders(tenantMap) {
  const source = await crm.query(`
    SELECT id, tenant_id, request_id, title, note, remind_at, user_id, status,
           sent_at, dismissed_at, created_by, created_at, updated_at,
           deleted_at, deleted_by
    FROM crm_request_reminders
    ORDER BY created_at, id
  `)

  for (const row of source.rows) {
    const tenantId = tenantMap.get(row.tenant_id)
    if (!tenantId)
      throw new Error(`No Work tenant mapping for CRM tenant ${row.tenant_id}`)

    await work.query(
      `INSERT INTO work_reminders
        (id, tenant_id, context_service, context_resource, context_id,
         title, note, remind_at, user_id, status, sent_at, dismissed_at,
         created_by, created_at, updated_at, deleted_at, deleted_by)
       VALUES
        ($1, $2, 'crm', 'request', $3, $4, $5, $6, $7,
         $8::"WorkReminderStatus", $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         context_service = EXCLUDED.context_service,
         context_resource = EXCLUDED.context_resource,
         context_id = EXCLUDED.context_id,
         title = EXCLUDED.title,
         note = EXCLUDED.note,
         remind_at = EXCLUDED.remind_at,
         user_id = EXCLUDED.user_id,
         status = EXCLUDED.status,
         sent_at = EXCLUDED.sent_at,
         dismissed_at = EXCLUDED.dismissed_at,
         created_by = EXCLUDED.created_by,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at,
         deleted_by = EXCLUDED.deleted_by`,
      [
        row.id,
        tenantId,
        row.request_id,
        row.title,
        row.note,
        row.remind_at,
        row.user_id,
        row.status,
        row.sent_at,
        row.dismissed_at,
        row.created_by,
        row.created_at,
        row.updated_at,
        row.deleted_at,
        row.deleted_by,
      ]
    )
  }

  return source.rowCount ?? source.rows.length
}

async function main() {
  const tenants = await crm.query(`
    SELECT id, organization_id, status, created_at, updated_at
    FROM crm_tenants
    ORDER BY created_at, id
  `)
  const tenantMap = new Map()
  for (const tenant of tenants.rows)
    tenantMap.set(tenant.id, await ensureWorkTenant(tenant))

  const tasks = await copyTasks(tenantMap)
  const reminders = await copyReminders(tenantMap)

  const workTasks = await work.query(
    `SELECT COUNT(*)::int AS count FROM work_tasks
     WHERE context_service = 'crm' AND context_resource = 'request'`
  )
  const workReminders = await work.query(
    `SELECT COUNT(*)::int AS count FROM work_reminders
     WHERE context_service = 'crm' AND context_resource = 'request'`
  )

  console.info(
    JSON.stringify(
      {
        crmTenants: tenants.rowCount ?? tenants.rows.length,
        copiedTasks: tasks,
        copiedReminders: reminders,
        workCrmTasks: workTasks.rows[0].count,
        workCrmReminders: workReminders.rows[0].count,
      },
      null,
      2
    )
  )
}

try {
  await main()
} finally {
  await Promise.all([crm.end(), work.end()])
}
