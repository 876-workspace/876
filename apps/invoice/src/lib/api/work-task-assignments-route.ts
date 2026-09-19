import 'server-only'

import { apiSuccess, getError } from '@876/core'
import {
  createWorkTaskAssignmentInputSchema,
  updateWorkTaskAssignmentInputSchema,
  workAssignmentRoleSchema,
  workTaskAssignmentResponseInputSchema,
} from '@876/work'
import { z } from 'zod'

import { workTaskMatchesContext } from '@/lib/api/work-context-match'
import { workErrorResponse } from '@/lib/api/work-response'
import { requireAuthorizedInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

const createSchema = createWorkTaskAssignmentInputSchema.omit({
  assignedBy: true,
  status: true,
})
const updateSchema = z.strictObject({ role: workAssignmentRoleSchema })

async function authorizeTask(
  permission: string,
  taskId: string,
  invoiceId?: string
) {
  const auth = await requireWorkWidgetPermission(permission)
  if (auth.response) return { response: auth.response as Response }
  if (!taskId.trim())
    return { response: workErrorResponse(getError('work/invalid-request')) }

  const context = invoiceId
    ? await requireAuthorizedInvoiceWorkContext(invoiceId, auth)
    : null
  if (context?.response) return { response: context.response }

  const work = await getWork()
  if (context?.context) {
    const task = await work.tasks.retrieve(auth.orgId, taskId)
    if (task.error) return { response: workErrorResponse(task.error) }
    if (!workTaskMatchesContext(task.data, context.context))
      return { response: workErrorResponse(getError('work/not-found')) }
  }
  return { response: null, auth, work }
}

export async function handleGetTaskAssignments(
  taskId: string,
  invoiceId?: string
) {
  const access = await authorizeTask('tasks.view', taskId, invoiceId)
  if (access.response) return access.response
  const result = await access.work.taskAssignments.list(
    access.auth.orgId,
    taskId
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handlePostTaskAssignment(
  request: Request,
  taskId: string,
  invoiceId?: string
) {
  const access = await authorizeTask('tasks.assign', taskId, invoiceId)
  if (access.response) return access.response
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))
  const canonical = createWorkTaskAssignmentInputSchema.safeParse({
    ...parsed.data,
    status: 'PENDING',
    assignedBy: access.auth.userId,
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))
  const result = await access.work.taskAssignments.create(
    access.auth.orgId,
    taskId,
    canonical.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data, { status: 201 })
}

export async function handlePatchTaskAssignment(
  request: Request,
  taskId: string,
  assignmentId: string,
  invoiceId?: string
) {
  const access = await authorizeTask('tasks.assign', taskId, invoiceId)
  if (access.response) return access.response
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))
  const canonical = updateWorkTaskAssignmentInputSchema.safeParse(parsed.data)
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))
  const result = await access.work.taskAssignments.update(
    access.auth.orgId,
    taskId,
    assignmentId,
    canonical.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handleRespondTaskAssignment(
  request: Request,
  taskId: string,
  assignmentId: string,
  invoiceId?: string
) {
  const access = await authorizeTask('tasks.respond', taskId, invoiceId)
  if (access.response) return access.response
  const parsed = workTaskAssignmentResponseInputSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))
  const result = await access.work.taskAssignments.respond(
    access.auth.orgId,
    taskId,
    assignmentId,
    parsed.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function handleDeleteTaskAssignment(
  taskId: string,
  assignmentId: string,
  invoiceId?: string
) {
  const access = await authorizeTask('tasks.assign', taskId, invoiceId)
  if (access.response) return access.response
  const result = await access.work.taskAssignments.delete(
    access.auth.orgId,
    taskId,
    assignmentId
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
