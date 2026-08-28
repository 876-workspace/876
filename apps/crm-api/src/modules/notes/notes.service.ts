import { crmError } from '../../http/errors.js'
import type {
  CreateRequestNoteInput,
  CrmRequestNote,
  DeleteRequestNoteInput,
  ListRequestNotesInput,
  UpdateRequestNoteInput,
} from '../../types/request.js'
import { requireRequestContext } from '../requests/index.js'
import * as repository from './notes.repository.js'

type NoteRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function serialize(note: NoteRow): CrmRequestNote {
  return {
    object: 'request_note',
    id: note.id,
    tenantId: note.tenantId,
    requestId: note.requestId,
    body: note.body,
    authorId: note.authorId,
    internal: note.internal,
    visibility: note.privateToUserId
      ? 'PRIVATE'
      : note.internal
        ? 'INTERNAL'
        : 'PUBLIC',
    kind: note.kind,
    editedAt: note.editedAt ? Math.floor(note.editedAt.getTime() / 1000) : null,
    createdAt: Math.floor(note.createdAt.getTime() / 1000),
    updatedAt: Math.floor(note.updatedAt.getTime() / 1000),
  }
}

export async function list(
  organizationId: string,
  requestId: string,
  access: ListRequestNotesInput = {}
) {
  const context = await requireRequestContext(organizationId, requestId)
  const notes = await repository.list(context.tenantId, requestId, access)

  return notes.map(serialize)
}

export async function create(
  organizationId: string,
  requestId: string,
  input: CreateRequestNoteInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  const note = await repository.create({
    tenantId: context.tenantId,
    requestId,
    ...input,
  })

  return serialize(note)
}

export async function update(
  organizationId: string,
  requestId: string,
  noteId: string,
  input: UpdateRequestNoteInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  const current = await repository.retrieve(context.tenantId, requestId, noteId)
  if (!current) return null
  if (
    current.privateToUserId &&
    !input.includePrivate &&
    current.privateToUserId !== input.editedBy
  )
    return null

  return serialize(await repository.update(noteId, { body: input.body }))
}

export async function remove(
  organizationId: string,
  requestId: string,
  noteId: string,
  input: DeleteRequestNoteInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  const current = await repository.retrieve(context.tenantId, requestId, noteId)
  if (!current) return null
  if (
    current.privateToUserId &&
    !input.includePrivate &&
    current.privateToUserId !== input.deletedBy
  )
    return null
  if (current.kind === 'DESCRIPTION')
    throw crmError('crm/description-note-immutable')

  return repository.remove(noteId, input.deletedBy)
}
