#!/usr/bin/env node
import { config } from 'dotenv'
import pg from 'pg'

config({ path: ['.env.development.local', '.env.development', '.env'] })

const { Pool } = pg
const crmUrl =
  process.env.CRM_DIRECT_DATABASE_URL ?? process.env.CRM_DATABASE_URL
const workUrl =
  process.env.WORK_DIRECT_DATABASE_URL ?? process.env.WORK_DATABASE_URL

if (!crmUrl)
  throw new Error('CRM_DATABASE_URL is required for CRM verification.')
if (!workUrl)
  throw new Error('WORK_DATABASE_URL is required for CRM verification.')

const crm = new Pool({ connectionString: crmUrl })
const work = new Pool({ connectionString: workUrl })

function instant(value) {
  return value === null || value === undefined
    ? null
    : new Date(value).toISOString()
}

function taskSnapshot(row, side) {
  if (side === 'crm') {
    return {
      organizationId: row.organization_id,
      contextService: 'crm',
      contextResource: 'request',
      contextId: row.request_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priorityId: row.priority_id,
      assigneeId: row.assignee_id,
      dueAt: instant(row.due_at),
      completedAt: instant(row.completed_at),
      completedBy: row.completed_by,
      sortOrder: row.sort_order,
      createdBy: row.created_by,
      createdAt: instant(row.created_at),
      updatedAt: instant(row.updated_at),
      deletedAt: instant(row.deleted_at),
      deletedBy: row.deleted_by,
    }
  }

  return {
    organizationId: row.organization_id,
    contextService: row.context_service,
    contextResource: row.context_resource,
    contextId: row.context_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priorityId: row.priority_id,
    assigneeId: row.assignee_id,
    dueAt: instant(row.due_at),
    completedAt: instant(row.completed_at),
    completedBy: row.completed_by,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: instant(row.created_at),
    updatedAt: instant(row.updated_at),
    deletedAt: instant(row.deleted_at),
    deletedBy: row.deleted_by,
  }
}

function reminderSnapshot(row, side) {
  if (side === 'crm') {
    return {
      organizationId: row.organization_id,
      contextService: 'crm',
      contextResource: 'request',
      contextId: row.request_id,
      title: row.title,
      note: row.note,
      remindAt: instant(row.remind_at),
      userId: row.user_id,
      status: row.status,
      sentAt: instant(row.sent_at),
      dismissedAt: instant(row.dismissed_at),
      createdBy: row.created_by,
      createdAt: instant(row.created_at),
      updatedAt: instant(row.updated_at),
      deletedAt: instant(row.deleted_at),
      deletedBy: row.deleted_by,
    }
  }

  return {
    organizationId: row.organization_id,
    contextService: row.context_service,
    contextResource: row.context_resource,
    contextId: row.context_id,
    title: row.title,
    note: row.note,
    remindAt: instant(row.remind_at),
    userId: row.user_id,
    status: row.status,
    sentAt: instant(row.sent_at),
    dismissedAt: instant(row.dismissed_at),
    createdBy: row.created_by,
    createdAt: instant(row.created_at),
    updatedAt: instant(row.updated_at),
    deletedAt: instant(row.deleted_at),
    deletedBy: row.deleted_by,
  }
}

function compareRows(sourceRows, targetRows, snapshot) {
  const source = new Map(sourceRows.map((row) => [row.id, row]))
  const target = new Map(targetRows.map((row) => [row.id, row]))
  const missingInWork = [...source.keys()].filter((id) => !target.has(id))
  const unexpectedInWork = [...target.keys()].filter((id) => !source.has(id))
  const mismatched = []

  for (const [id, sourceRow] of source) {
    const targetRow = target.get(id)
    if (!targetRow) continue
    const expected = snapshot(sourceRow, 'crm')
    const actual = snapshot(targetRow, 'work')
    if (JSON.stringify(expected) !== JSON.stringify(actual))
      mismatched.push({ id, expected, actual })
  }

  return { missingInWork, unexpectedInWork, mismatched }
}

async function main() {
  const [
    crmTenants,
    workTenants,
    crmTasks,
    workTasks,
    crmReminders,
    workReminders,
  ] = await Promise.all([
    crm.query(`
        SELECT organization_id, status
        FROM crm_tenants
        ORDER BY organization_id
      `),
    work.query(`
        SELECT organization_id, status
        FROM work_tenants
        ORDER BY organization_id
      `),
    crm.query(`
        SELECT t.*, tenant.organization_id
        FROM crm_request_tasks t
        JOIN crm_tenants tenant ON tenant.id = t.tenant_id
        ORDER BY t.id
      `),
    work.query(`
        SELECT t.*, tenant.organization_id
        FROM work_tasks t
        JOIN work_tenants tenant ON tenant.id = t.tenant_id
        WHERE t.context_service = 'crm' AND t.context_resource = 'request'
        ORDER BY t.id
      `),
    crm.query(`
        SELECT r.*, tenant.organization_id
        FROM crm_request_reminders r
        JOIN crm_tenants tenant ON tenant.id = r.tenant_id
        ORDER BY r.id
      `),
    work.query(`
        SELECT r.*, tenant.organization_id
        FROM work_reminders r
        JOIN work_tenants tenant ON tenant.id = r.tenant_id
        WHERE r.context_service = 'crm' AND r.context_resource = 'request'
        ORDER BY r.id
      `),
  ])

  const workTenantByOrg = new Map(
    workTenants.rows.map((row) => [row.organization_id, row.status])
  )
  const tenantProblems = crmTenants.rows.flatMap((row) => {
    const status = workTenantByOrg.get(row.organization_id)
    if (status === undefined)
      return [{ organizationId: row.organization_id, problem: 'missing' }]
    if (status !== row.status)
      return [
        {
          organizationId: row.organization_id,
          problem: 'status-mismatch',
          crm: row.status,
          work: status,
        },
      ]
    return []
  })

  const tasks = compareRows(crmTasks.rows, workTasks.rows, taskSnapshot)
  const reminders = compareRows(
    crmReminders.rows,
    workReminders.rows,
    reminderSnapshot
  )

  const report = {
    tenants: {
      crm: crmTenants.rowCount ?? crmTenants.rows.length,
      work: workTenants.rowCount ?? workTenants.rows.length,
      problems: tenantProblems,
    },
    tasks: {
      crm: crmTasks.rowCount ?? crmTasks.rows.length,
      workCrmContext: workTasks.rowCount ?? workTasks.rows.length,
      ...tasks,
    },
    reminders: {
      crm: crmReminders.rowCount ?? crmReminders.rows.length,
      workCrmContext: workReminders.rowCount ?? workReminders.rows.length,
      ...reminders,
    },
  }

  console.info(JSON.stringify(report, null, 2))

  const failed =
    tenantProblems.length > 0 ||
    tasks.missingInWork.length > 0 ||
    tasks.unexpectedInWork.length > 0 ||
    tasks.mismatched.length > 0 ||
    reminders.missingInWork.length > 0 ||
    reminders.unexpectedInWork.length > 0 ||
    reminders.mismatched.length > 0

  if (failed) process.exitCode = 1
}

try {
  await main()
} finally {
  await Promise.all([crm.end(), work.end()])
}
