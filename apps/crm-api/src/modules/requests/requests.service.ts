import type {
  CreateRequestInput,
  CreateRequestNoteInput,
  DeleteRequestInput,
  DeleteRequestNoteInput,
  ListRequestsFilter,
  UpdateRequestInput,
  UpdateRequestNoteInput,
} from '../../types/request.js'
import * as tenants from '../tenants/tenants.service.js'

import { crmError } from '../../http/errors.js'
import * as repository from './requests.repository.js'

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) throw crmError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') throw crmError('crm/tenant-inactive')

  return tenant
}

function serialize(
  request: NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>
) {
  return {
    object: 'request' as const,
    id: request.id,
    tenantId: request.tenantId,
    customerId: request.customerId,
    number: request.number,
    subject: request.subject,
    categoryId: request.categoryId,
    subcategoryId: request.subcategoryId,
    status: request.status,
    priority: request.priority,
    source: request.source,
    teamId: request.teamId,
    assigneeId: request.assigneeId,
    ownerId: request.ownerId,
    requesterUserId: request.requesterUserId,
    requesterContactId: request.requesterContactId,
    createdBy: request.createdBy,
    resolvedAt: request.resolvedAt
      ? Math.floor(request.resolvedAt.getTime() / 1000)
      : null,
    closedAt: request.closedAt
      ? Math.floor(request.closedAt.getTime() / 1000)
      : null,
    createdAt: Math.floor(request.createdAt.getTime() / 1000),
    updatedAt: Math.floor(request.updatedAt.getTime() / 1000),
  }
}

function serializeNote(
  note: NonNullable<Awaited<ReturnType<typeof repository.retrieveNote>>>
) {
  return {
    object: 'request_note' as const,
    id: note.id,
    tenantId: note.tenantId,
    requestId: note.requestId,
    body: note.body,
    authorId: note.authorId,
    internal: note.internal,
    kind: note.kind,
    editedAt: note.editedAt ? Math.floor(note.editedAt.getTime() / 1000) : null,
    createdAt: Math.floor(note.createdAt.getTime() / 1000),
    updatedAt: Math.floor(note.updatedAt.getTime() / 1000),
  }
}

export async function list(
  organizationId: string,
  filters?: ListRequestsFilter
) {
  const tenant = await requireTenant(organizationId)
  const requests = await repository.list(tenant.id, filters)

  return requests.map(serialize)
}

export async function retrieve(organizationId: string, id: string) {
  const tenant = await requireTenant(organizationId)
  const request = await repository.retrieve(tenant.id, id)

  return request ? serialize(request) : null
}

export async function create(
  organizationId: string,
  input: CreateRequestInput
) {
  const tenant = await requireTenant(organizationId)
  const customer = await repository.customerExists(tenant.id, input.customerId)
  if (!customer) throw crmError('crm/customer-not-found')

  const category = input.categoryId
    ? await repository.categoryExists(tenant.id, input.categoryId)
    : null
  if (input.categoryId && !category) throw crmError('crm/category-not-found')
  const subcategory = input.subcategoryId
    ? await repository.subcategoryExists(tenant.id, input.subcategoryId)
    : null
  if (input.subcategoryId && !subcategory)
    throw crmError('crm/subcategory-not-found')
  if (subcategory && subcategory.categoryId !== input.categoryId)
    throw crmError('crm/subcategory-category-mismatch')
  if (input.teamId && !(await repository.teamExists(tenant.id, input.teamId)))
    throw crmError('crm/team-not-found')

  // Category routing is useful only as a default; an explicit caller selection wins.
  const defaults = subcategory ?? category
  const effective = {
    ...input,
    ...(input.teamId === undefined && defaults?.defaultTeamId
      ? { teamId: defaults.defaultTeamId }
      : {}),
    ...(input.priority === undefined && defaults?.defaultPriority
      ? { priority: defaults.defaultPriority }
      : {}),
  }

  return serialize(
    await repository.create({ tenantId: tenant.id, ...effective })
  )
}

export async function update(
  organizationId: string,
  id: string,
  input: UpdateRequestInput
) {
  const tenant = await requireTenant(organizationId)
  const current = await repository.retrieve(tenant.id, id)
  if (!current) return null

  const resultingCategoryId =
    input.categoryId === undefined ? current.categoryId : input.categoryId
  if (
    input.categoryId &&
    !(await repository.categoryExists(tenant.id, input.categoryId))
  )
    throw crmError('crm/category-not-found')
  const subcategory = input.subcategoryId
    ? await repository.subcategoryExists(tenant.id, input.subcategoryId)
    : null
  if (input.subcategoryId && !subcategory)
    throw crmError('crm/subcategory-not-found')
  if (input.subcategoryId) {
    if (subcategory?.categoryId !== resultingCategoryId)
      throw crmError('crm/subcategory-category-mismatch')
  }
  if (input.teamId && !(await repository.teamExists(tenant.id, input.teamId)))
    throw crmError('crm/team-not-found')

  const teamChanged =
    input.teamId !== undefined && input.teamId !== current.teamId
  const assigneeMustClear =
    teamChanged &&
    input.teamId &&
    current.assigneeId &&
    !(await repository.isTeamMember(
      tenant.id,
      input.teamId,
      current.assigneeId
    ))

  const now = new Date()
  const next = await repository.update(id, {
    ...input,
    ...(assigneeMustClear && input.assigneeId === undefined
      ? { assigneeId: null }
      : {}),
    ...(input.status === 'RESOLVED' && !current.resolvedAt
      ? { resolvedAt: now }
      : {}),
    ...(input.status && input.status !== 'RESOLVED' && current.resolvedAt
      ? { resolvedAt: null }
      : {}),
    ...(input.status === 'CLOSED' && !current.closedAt
      ? { closedAt: now }
      : {}),
    ...(input.status && input.status !== 'CLOSED' && current.closedAt
      ? { closedAt: null }
      : {}),
  })

  return serialize(next)
}

export async function remove(
  organizationId: string,
  id: string,
  input: DeleteRequestInput
) {
  const tenant = await requireTenant(organizationId)
  const current = await repository.retrieve(tenant.id, id)
  if (!current) return null

  return repository.remove({ id, ...input })
}

export async function listNotes(organizationId: string, requestId: string) {
  const tenant = await requireTenant(organizationId)
  const notes = await repository.listNotes(tenant.id, requestId)

  return notes.map(serializeNote)
}

export async function createNote(
  organizationId: string,
  requestId: string,
  input: CreateRequestNoteInput
) {
  const tenant = await requireTenant(organizationId)
  const request = await repository.retrieve(tenant.id, requestId)
  if (!request) throw crmError('crm/request-not-found')

  const note = await repository.createNote({
    tenantId: tenant.id,
    requestId,
    ...input,
  })

  return serializeNote(note)
}

export async function removeNote(
  organizationId: string,
  requestId: string,
  id: string,
  input: DeleteRequestNoteInput
) {
  const tenant = await requireTenant(organizationId)
  const current = await repository.retrieveNote(tenant.id, requestId, id)
  if (!current) return null
  if (current.kind === 'DESCRIPTION')
    throw crmError('crm/description-note-immutable')

  return repository.removeNote({
    id,
    deletedBy: input.deletedBy,
  })
}

export async function updateNote(
  organizationId: string,
  requestId: string,
  id: string,
  input: UpdateRequestNoteInput
) {
  const tenant = await requireTenant(organizationId)
  const current = await repository.retrieveNote(tenant.id, requestId, id)
  if (!current) return null

  return serializeNote(await repository.updateNote(id, input))
}
