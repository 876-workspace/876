import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { createWorkReminderInputSchema, toWorkContext } from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireAuthorizedInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

export const runtime = 'nodejs'

const createSchema = z.strictObject({
  title: z.string().trim().min(1).max(240),
  note: z.string().max(10_000).optional().nullable(),
  remindAt: z.number().int().nonnegative(),
  timeZone: z.string().trim().min(1).max(120).optional().nullable(),
})

export async function handlePostWorkReminder(
  request: Request,
  invoiceId?: string
) {
  const auth = await requireWorkWidgetPermission('reminders.create')
  if (auth.response) return auth.response

  const context = invoiceId
    ? await requireAuthorizedInvoiceWorkContext(invoiceId, auth)
    : null
  if (context?.response) return context.response

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = createWorkReminderInputSchema.safeParse({
    ...parsed.data,
    ...(context?.context ? { context: toWorkContext(context.context) } : {}),
    userId: auth.userId,
    createdBy: auth.userId,
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.reminders.create(auth.orgId, canonical.data)
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}
