import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { workRecurrenceDraftSchema } from '@876/work'

import {
  workEventMatchesContext,
  workReminderMatchesContext,
  workTaskMatchesContext,
} from '@/lib/api/work-context-match'
import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { requireAuthorizedInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { getWork } from '@/lib/services/work'

type RecurrenceParent =
  | { type: 'task'; id: string }
  | { type: 'event'; id: string }
  | { type: 'reminder'; id: string }

type Authorized = {
  response: null
  auth: { response: null; orgId: string; userId: string }
  work: Awaited<ReturnType<typeof getWork>>
}

function permissionFor(parent: RecurrenceParent, action: 'view' | 'edit') {
  const resource =
    parent.type === 'task'
      ? 'tasks'
      : parent.type === 'event'
        ? 'events'
        : 'reminders'
  return `${resource}.${action}`
}

async function authorizeParent(
  parent: RecurrenceParent,
  action: 'view' | 'edit',
  invoiceId?: string
): Promise<{ response: Response } | Authorized> {
  const auth = await requireWorkWidgetPermission(permissionFor(parent, action))
  if (auth.response) return { response: auth.response }
  if (!parent.id.trim())
    return { response: workErrorResponse(getError('work/invalid-request')) }

  const context = invoiceId
    ? await requireAuthorizedInvoiceWorkContext(invoiceId, auth)
    : null
  if (context?.response) return { response: context.response }

  const work = await getWork()
  if (!context?.context) return { response: null, auth, work }

  if (parent.type === 'task') {
    const result = await work.tasks.retrieve(auth.orgId, parent.id)
    if (result.error) return { response: workErrorResponse(result.error) }
    if (!workTaskMatchesContext(result.data, context.context))
      return { response: workErrorResponse(getError('work/not-found')) }
  } else if (parent.type === 'event') {
    const result = await work.events.retrieve(auth.orgId, parent.id)
    if (result.error) return { response: workErrorResponse(result.error) }
    if (!workEventMatchesContext(result.data, context.context))
      return { response: workErrorResponse(getError('work/not-found')) }
  } else {
    const result = await work.reminders.retrieve(auth.orgId, parent.id)
    if (result.error) return { response: workErrorResponse(result.error) }
    if (!workReminderMatchesContext(result.data, context.context))
      return { response: workErrorResponse(getError('work/not-found')) }
  }

  return { response: null, auth, work }
}

function resourceRecurrence(access: Authorized, parent: RecurrenceParent) {
  if (parent.type === 'task') return access.work.tasks.recurrence
  if (parent.type === 'event') return access.work.events.recurrence
  return access.work.reminders.recurrence
}

export async function handleGetWorkRecurrence(
  parent: RecurrenceParent,
  invoiceId?: string
) {
  const access = await authorizeParent(parent, 'view', invoiceId)
  if (access.response) return access.response

  const result = await resourceRecurrence(access, parent).retrieve(
    access.auth.orgId,
    parent.id
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handlePatchWorkRecurrence(
  request: Request,
  parent: RecurrenceParent,
  invoiceId?: string
) {
  const access = await authorizeParent(parent, 'edit', invoiceId)
  if (access.response) return access.response

  const parsed = workRecurrenceDraftSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const result = await resourceRecurrence(access, parent).set(
    access.auth.orgId,
    parent.id,
    parsed.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handleDeleteWorkRecurrence(
  parent: RecurrenceParent,
  invoiceId?: string
) {
  const access = await authorizeParent(parent, 'edit', invoiceId)
  if (access.response) return access.response

  const result = await resourceRecurrence(access, parent).clear(
    access.auth.orgId,
    parent.id
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
