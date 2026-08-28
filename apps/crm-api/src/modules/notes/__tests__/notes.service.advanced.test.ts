import { beforeEach, describe, expect, it, vi } from 'vitest'

const { context, repo } = vi.hoisted(() => ({
  context: { requireRequestContext: vi.fn() },
  repo: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('../../requests/index.js', () => context)
vi.mock('../notes.repository.js', () => repo)

const service = await import('../notes.service.js')

const tenantId = 'crm_tenant_1'
const requestId = 'crm_req_1'

function noteRow(overrides: Record<string, unknown> = {}) {
  const at = new Date('2026-08-27T00:00:00.000Z')
  return {
    id: 'crm_note_1',
    tenantId,
    requestId,
    body: 'hello',
    authorId: 'usr_1',
    internal: false,
    privateToUserId: null,
    kind: 'NOTE' as const,
    editedAt: null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  context.requireRequestContext.mockResolvedValue({ tenantId, requestId })
  repo.list.mockResolvedValue([])
  repo.retrieve.mockResolvedValue(null)
  repo.create.mockResolvedValue(noteRow())
  repo.update.mockResolvedValue(noteRow({ body: 'x', editedAt: new Date('2026-08-28T00:00:00Z') }))
  repo.remove.mockResolvedValue({ object: 'request_note', id: 'crm_note_1', deleted: true })
})

describe('notes.service.advanced - list visibility and error propagation', () => {
  it('propagates tenant-not-found from requireRequestContext', async () => {
    context.requireRequestContext.mockRejectedValue({ code: 'crm/tenant-not-found' })
    await expect(service.list('org_1', requestId)).rejects.toMatchObject({ code: 'crm/tenant-not-found' })
  })

  it('propagates request-not-found', async () => {
    context.requireRequestContext.mockRejectedValue({ code: 'crm/request-not-found' })
    await expect(service.list('org_1', 'missing')).rejects.toMatchObject({ code: 'crm/request-not-found' })
  })

  it('maps list rows to request_note with correct visibility conversions', async () => {
    const at = new Date('2026-08-27T12:00:00.000Z')
    repo.list.mockResolvedValue([
      noteRow({ id: 'n1', internal: false, privateToUserId: null, createdAt: at, updatedAt: at }),
      noteRow({ id: 'n2', internal: true, privateToUserId: null, createdAt: at, updatedAt: at }),
      noteRow({ id: 'n3', internal: true, privateToUserId: 'usr_owner', createdAt: at, updatedAt: at }),
    ])
    const result = await service.list('org_1', requestId)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 'n1', visibility: 'PUBLIC', internal: false })
    expect(result[1]).toMatchObject({ id: 'n2', visibility: 'INTERNAL', internal: true })
    expect(result[2]).toMatchObject({ id: 'n3', visibility: 'PRIVATE', internal: true })
  })

  it('serializes editedAt as null when not edited and as unix seconds when edited', async () => {
    const editedAt = new Date('2026-08-28T09:00:00.000Z')
    repo.list.mockResolvedValue([noteRow({ id: 'n1', editedAt: null }), noteRow({ id: 'n2', editedAt })])
    const result = await service.list('org_1', requestId)
    expect(result[0].editedAt).toBeNull()
    expect(result[1].editedAt).toBe(Math.floor(editedAt.getTime() / 1000))
  })

  it('forwards viewer scope including includePrivate true to repository', async () => {
    await service.list('org_1', requestId, { viewerId: 'usr_x', includePrivate: true })
    expect(repo.list).toHaveBeenCalledWith(tenantId, requestId, { viewerId: 'usr_x', includePrivate: true })
  })

  it('serializes timestamps to unix seconds for createdAt/updatedAt', async () => {
    const at = new Date('2026-08-27T00:00:00.000Z')
    repo.list.mockResolvedValue([noteRow({ createdAt: at, updatedAt: at })])
    const [note] = await service.list('org_1', requestId)
    expect(note.createdAt).toBe(Math.floor(at.getTime() / 1000))
    expect(note.updatedAt).toBe(Math.floor(at.getTime() / 1000))
    expect(note.object).toBe('request_note')
  })
})

describe('notes.service.advanced - create edge cases', () => {
  it('forwards visibility PUBLIC explicitly', async () => {
    await service.create('org_1', requestId, { body: 'hi', authorId: 'usr_1', visibility: 'PUBLIC' })
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'PUBLIC' }))
  })

  it('forwards visibility PRIVATE with internal true', async () => {
    await service.create('org_1', requestId, { body: 'hi', authorId: 'usr_1', visibility: 'PRIVATE' })
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'PRIVATE' }))
  })

  it('forwards legacy internal flag when visibility absent', async () => {
    await service.create('org_1', requestId, { body: 'hi', authorId: 'usr_1', internal: false })
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ internal: false }))
  })

  it('does not call repository when tenant context fails', async () => {
    context.requireRequestContext.mockRejectedValue({ code: 'crm/request-not-found' })
    await expect(service.create('org_1', requestId, { body: 'hi', authorId: 'usr_1' })).rejects.toMatchObject({
      code: 'crm/request-not-found',
    })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('serializes created note to public contract shape', async () => {
    const at = new Date('2026-08-27T00:00:00.000Z')
    repo.create.mockResolvedValue(noteRow({ body: 'my body', authorId: 'usr_9', createdAt: at, updatedAt: at }))
    const result = await service.create('org_1', requestId, { body: 'my body', authorId: 'usr_9' })
    expect(result).toMatchObject({ object: 'request_note', body: 'my body', authorId: 'usr_9', createdAt: Math.floor(at.getTime()/1000) })
  })
})

describe('notes.service.advanced - update private note access', () => {
  it('blocks PRIVATE note update by non-owner without includePrivate', async () => {
    repo.retrieve.mockResolvedValue(noteRow({ privateToUserId: 'usr_owner' }))
    expect(await service.update('org_1', requestId, 'crm_note_1', { body: 'x', editedBy: 'usr_attacker' })).toBeNull()
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('allows PRIVATE note update by owner', async () => {
    repo.retrieve.mockResolvedValue(noteRow({ privateToUserId: 'usr_owner' }))
    const res = await service.update('org_1', requestId, 'crm_note_1', { body: 'x', editedBy: 'usr_owner' })
    expect(res).not.toBeNull()
    expect(repo.update).toHaveBeenCalledWith('crm_note_1', { body: 'x' })
  })

  it('allows Console to update PRIVATE note with includePrivate true regardless of editor', async () => {
    repo.retrieve.mockResolvedValue(noteRow({ privateToUserId: 'usr_owner' }))
    await service.update('org_1', requestId, 'crm_note_1', { body: 'x', editedBy: 'console_admin', includePrivate: true })
    expect(repo.update).toHaveBeenCalledWith('crm_note_1', { body: 'x' })
  })

  it('allows public note update by anyone', async () => {
    repo.retrieve.mockResolvedValue(noteRow({ privateToUserId: null, internal: false }))
    await service.update('org_1', requestId, 'crm_note_1', { body: 'x', editedBy: 'usr_other' })
    expect(repo.update).toHaveBeenCalled()
  })

  it('returns null when note does not exist', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(await service.update('org_1', requestId, 'missing', { body: 'x', editedBy: 'usr_1' })).toBeNull()
  })

  it('propagates context errors', async () => {
    context.requireRequestContext.mockRejectedValue({ code: 'crm/request-not-found' })
    await expect(service.update('org_1', requestId, 'crm_note_1', { body: 'x', editedBy: 'usr_1' })).rejects.toMatchObject({ code: 'crm/request-not-found' })
  })
})

describe('notes.service.advanced - remove with privacy', () => {
  it('blocks deletion of PRIVATE note by non-owner', async () => {
    repo.retrieve.mockResolvedValue(noteRow({ privateToUserId: 'usr_owner' }))
    expect(await service.remove('org_1', requestId, 'crm_note_1', { deletedBy: 'usr_attacker' })).toBeNull()
    expect(repo.remove).not.toHaveBeenCalled()
  })

  it('allows owner to delete PRIVATE note', async () => {
    repo.retrieve.mockResolvedValue(noteRow({ privateToUserId: 'usr_owner' }))
    await service.remove('org_1', requestId, 'crm_note_1', { deletedBy: 'usr_owner' })
    expect(repo.remove).toHaveBeenCalledWith('crm_note_1', 'usr_owner')
  })

  it('allows Console delete with includePrivate', async () => {
    repo.retrieve.mockResolvedValue(noteRow({ privateToUserId: 'usr_owner' }))
    await service.remove('org_1', requestId, 'crm_note_1', { deletedBy: 'console_admin', includePrivate: true })
    expect(repo.remove).toHaveBeenCalled()
  })

  it('returns null for missing note', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(await service.remove('org_1', requestId, 'bad', { deletedBy: 'usr_1' })).toBeNull()
  })

  it('returns tombstone and propagates description-note-immutable', async () => {
    repo.retrieve.mockResolvedValue(noteRow())
    repo.remove.mockRejectedValue({ code: 'crm/description-note-immutable' })
    await expect(service.remove('org_1', requestId, 'crm_note_1', { deletedBy: 'usr_1' })).rejects.toMatchObject({ code: 'crm/description-note-immutable' })
  })
})
