import 'server-only'

import { apiSuccess, getError } from '@876/core'
import {
  createWorkAlertInputSchema,
  updateWorkAlertInputSchema,
  workAlertActionSchema,
  workAlertTriggerTypeSchema,
} from '@876/work'
import { z } from 'zod'

import {
  workEventMatchesContext,
  workTaskMatchesContext,
} from '@/lib/api/work-context-match'
import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { requireAuthorizedInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { getWork } from '@/lib/clients/work'

type AlertParent = { type: 'task'; id: string } | { type: 'event'; id: string }

const createSchema = z
  .strictObject({
    triggerType: workAlertTriggerTypeSchema,
    triggerAt: z.number().int().optional().nullable(),
    offsetSeconds: z.number().int().optional().nullable(),
    action: workAlertActionSchema.optional(),
  })
  .superRefine((value, context) => {
    const absolute = value.triggerType === 'ABSOLUTE'
    if (
      absolute !== (value.triggerAt != null) ||
      absolute === (value.offsetSeconds != null)
    )
      context.addIssue({
        code: 'custom',
        message:
          'Absolute alerts require triggerAt; relative alerts require offsetSeconds.',
      })
  })

const updateSchema = z
  .strictObject({
    triggerType: workAlertTriggerTypeSchema.optional(),
    triggerAt: z.number().int().optional().nullable(),
    offsetSeconds: z.number().int().optional().nullable(),
    action: workAlertActionSchema.optional(),
    status: z.enum(['SCHEDULED', 'DISMISSED', 'CANCELLED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

function permissionFor(parent: AlertParent, action: 'view' | 'edit') {
  return `${parent.type === 'task' ? 'tasks' : 'events'}.${action}`
}

async function authorizeParent(
  parent: AlertParent,
  action: 'view' | 'edit',
  invoiceId?: string
) {
  const auth = await requireWorkWidgetPermission(permissionFor(parent, action))
  if (auth.response) return { response: auth.response as Response }
  if (!parent.id.trim())
    return { response: workErrorResponse(getError('work/invalid-request')) }

  const context = invoiceId
    ? await requireAuthorizedInvoiceWorkContext(invoiceId, auth)
    : null
  if (context?.response) return { response: context.response }

  const work = await getWork()
  if (parent.type === 'task') {
    const task = await work.tasks.retrieve(auth.orgId, parent.id)
    if (task.error) return { response: workErrorResponse(task.error) }
    if (context?.context && !workTaskMatchesContext(task.data, context.context))
      return { response: workErrorResponse(getError('work/not-found')) }
  } else {
    const event = await work.events.retrieve(auth.orgId, parent.id)
    if (event.error) return { response: workErrorResponse(event.error) }
    if (
      context?.context &&
      !workEventMatchesContext(event.data, context.context)
    )
      return { response: workErrorResponse(getError('work/not-found')) }
  }

  return { response: null, auth, work }
}

function parentFilter(parent: AlertParent) {
  return parent.type === 'task' ? { taskId: parent.id } : { eventId: parent.id }
}

function alertMatchesParent(
  alert: { taskId: string | null; eventId: string | null },
  parent: AlertParent
) {
  return parent.type === 'task'
    ? alert.taskId === parent.id && alert.eventId === null
    : alert.eventId === parent.id && alert.taskId === null
}

async function requireOwnedAlert(
  access: Awaited<ReturnType<typeof authorizeParent>> & {
    response: null
  },
  parent: AlertParent,
  alertId: string
) {
  if (!alertId.trim())
    return { data: null, error: getError('work/invalid-request') }
  const result = await access.work.alerts.retrieve(access.auth.orgId, alertId)
  if (result.error) return { data: null, error: result.error }
  if (
    result.data.userId !== access.auth.userId ||
    !alertMatchesParent(result.data, parent)
  )
    return { data: null, error: getError('work/not-found') }
  return { data: result.data, error: null }
}

export async function handleGetWorkAlerts(
  parent: AlertParent,
  invoiceId?: string
) {
  const access = await authorizeParent(parent, 'view', invoiceId)
  if (access.response) return access.response
  const result = await access.work.alerts.list(access.auth.orgId, {
    ...parentFilter(parent),
    userId: access.auth.userId,
    limit: 100,
  })
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handlePostWorkAlert(
  request: Request,
  parent: AlertParent,
  invoiceId?: string
) {
  const access = await authorizeParent(parent, 'edit', invoiceId)
  if (access.response) return access.response
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = createWorkAlertInputSchema.safeParse({
    ...parentFilter(parent),
    ...parsed.data,
    userId: access.auth.userId,
    createdBy: access.auth.userId,
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const result = await access.work.alerts.create(
    access.auth.orgId,
    canonical.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data, { status: 201 })
}

export async function handlePatchWorkAlert(
  request: Request,
  parent: AlertParent,
  alertId: string,
  invoiceId?: string
) {
  const access = await authorizeParent(parent, 'edit', invoiceId)
  if (access.response) return access.response
  const current = await requireOwnedAlert(access, parent, alertId)
  if (current.error) return workErrorResponse(current.error)

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))
  const canonical = updateWorkAlertInputSchema.safeParse(parsed.data)
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const result = await access.work.alerts.update(
    access.auth.orgId,
    alertId,
    canonical.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handleDeleteWorkAlert(
  parent: AlertParent,
  alertId: string,
  invoiceId?: string
) {
  const access = await authorizeParent(parent, 'edit', invoiceId)
  if (access.response) return access.response
  const current = await requireOwnedAlert(access, parent, alertId)
  if (current.error) return workErrorResponse(current.error)

  const result = await access.work.alerts.delete(access.auth.orgId, alertId)
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
