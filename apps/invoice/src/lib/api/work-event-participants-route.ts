import 'server-only'

import { apiSuccess, getError } from '@876/core'
import {
  createWorkEventParticipantInputSchema,
  updateWorkEventParticipantInputSchema,
  workEventParticipantResponseInputSchema,
  workParticipantRoleSchema,
} from '@876/work'
import { z } from 'zod'

import { workEventMatchesContext } from '@/lib/api/work-context-match'
import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { requireAuthorizedInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { getWork } from '@/lib/services/work'

const createSchema = createWorkEventParticipantInputSchema.omit({
  status: true,
  delegatedTo: true,
  delegatedFrom: true,
})

const updateSchema = z
  .strictObject({
    name: z.string().trim().max(240).optional().nullable(),
    role: workParticipantRoleSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

async function authorizeEvent(
  permission: string,
  eventId: string,
  invoiceId?: string
) {
  const auth = await requireWorkWidgetPermission(permission)
  if (auth.response) return { response: auth.response as Response }
  if (!eventId.trim())
    return { response: workErrorResponse(getError('work/invalid-request')) }

  const context = invoiceId
    ? await requireAuthorizedInvoiceWorkContext(invoiceId, auth)
    : null
  if (context?.response) return { response: context.response }

  const work = await getWork()
  if (context?.context) {
    const event = await work.events.retrieve(auth.orgId, eventId)
    if (event.error) return { response: workErrorResponse(event.error) }
    if (!workEventMatchesContext(event.data, context.context))
      return { response: workErrorResponse(getError('work/not-found')) }
  }

  return { response: null, auth, work }
}

export async function handleGetEventParticipants(
  eventId: string,
  invoiceId?: string
) {
  const access = await authorizeEvent('events.view', eventId, invoiceId)
  if (access.response) return access.response
  const result = await access.work.eventParticipants.list(
    access.auth.orgId,
    eventId
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handlePostEventParticipant(
  request: Request,
  eventId: string,
  invoiceId?: string
) {
  const access = await authorizeEvent('events.invite', eventId, invoiceId)
  if (access.response) return access.response
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = createWorkEventParticipantInputSchema.safeParse({
    ...parsed.data,
    status: 'NEEDS_ACTION',
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const result = await access.work.eventParticipants.create(
    access.auth.orgId,
    eventId,
    canonical.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data, { status: 201 })
}

export async function handlePatchEventParticipant(
  request: Request,
  eventId: string,
  participantId: string,
  invoiceId?: string
) {
  const access = await authorizeEvent('events.invite', eventId, invoiceId)
  if (access.response) return access.response
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = updateWorkEventParticipantInputSchema.safeParse(parsed.data)
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const result = await access.work.eventParticipants.update(
    access.auth.orgId,
    eventId,
    participantId,
    canonical.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handleRespondEventParticipant(
  request: Request,
  eventId: string,
  participantId: string,
  invoiceId?: string
) {
  const access = await authorizeEvent('events.respond', eventId, invoiceId)
  if (access.response) return access.response
  const parsed = workEventParticipantResponseInputSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const result = await access.work.eventParticipants.respond(
    access.auth.orgId,
    eventId,
    participantId,
    parsed.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handleDeleteEventParticipant(
  eventId: string,
  participantId: string,
  invoiceId?: string
) {
  const access = await authorizeEvent('events.invite', eventId, invoiceId)
  if (access.response) return access.response
  const result = await access.work.eventParticipants.delete(
    access.auth.orgId,
    eventId,
    participantId
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
