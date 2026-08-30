import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkEventParticipantInputSchema,
  updateWorkEventParticipantInputSchema,
} from '@876/work'

vi.mock('../events/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('./event-participants.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as events from '../events/index.js'
import * as repository from './event-participants.repository.js'
import * as service from './event-participants.service.js'

const event = { id: 'event_kingston_1', organizationId: 'org_kingston_1' }

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'part_1',
    eventId: event.id,
    kind: 'USER' as const,
    participantId: 'user_mandeville_1',
    email: null,
    name: 'Asha Brown',
    role: 'REQUIRED' as const,
    status: 'NEEDS_ACTION' as const,
    delegatedTo: null,
    delegatedFrom: null,
    respondedAt: null,
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(events.retrieve).mockResolvedValue(event as never)
  vi.mocked(repository.list).mockResolvedValue([])
  vi.mocked(repository.retrieve).mockResolvedValue(null)
})

describe('Work event-participants service', () => {
  it('create USER participant carries participantId and no email', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ kind: 'USER', participantId: 'user_kingston_9', email: null }) as never)
    const result = await service.create('org_kingston_1', event.id, { kind: 'USER', participantId: 'user_kingston_9' })
    expect(result).toEqual(expect.objectContaining({ kind: 'USER', participantId: 'user_kingston_9', email: null }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'USER', participantId: 'user_kingston_9', email: null }))
  })

  it('create EMAIL participant carries email and no participantId', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ kind: 'EMAIL', participantId: null, email: 'alejandra@example.test' }) as never)
    const result = await service.create('org_kingston_1', event.id, { kind: 'EMAIL', email: 'alejandra@example.test', name: 'Alejandra' })
    expect(result).toEqual(expect.objectContaining({ kind: 'EMAIL', email: 'alejandra@example.test', participantId: null }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'EMAIL', email: 'alejandra@example.test' }))
  })

  it('list returns participants for event', async () => {
    vi.mocked(repository.list).mockResolvedValue([row({ id: 'part_a' }), row({ id: 'part_b' })] as never)
    const result = await service.list('org_kingston_1', event.id) as { data: unknown[] }
    expect(result.data).toHaveLength(2)
    expect(repository.list).toHaveBeenCalledWith(event.id)
  })

  it('list returns tenant error when event not in tenant and never lists', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(events.retrieve).mockResolvedValue(err as never)
    const result = await service.list('org_kingston_1', event.id)
    expect(result).toEqual(err)
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('list returns null when event not found', async () => {
    vi.mocked(events.retrieve).mockResolvedValue(null as never)
    const result = await service.list('org_kingston_1', 'missing')
    expect(result).toBeNull()
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('create returns null when event not found and never creates', async () => {
    vi.mocked(events.retrieve).mockResolvedValue(null as never)
    const result = await service.create('org_kingston_1', 'missing', { kind: 'USER', participantId: 'user_1' })
    expect(result).toBeNull()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('update accepts participant and stamps respondedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'part_1', status: 'NEEDS_ACTION' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ id: 'part_1', status: 'ACCEPTED' }) as never)
    const result = await service.update('org_kingston_1', event.id, 'part_1', { status: 'ACCEPTED' })
    expect(result).toEqual(expect.objectContaining({ status: 'ACCEPTED' }))
    expect(repository.update).toHaveBeenCalledWith('part_1', expect.objectContaining({ status: 'ACCEPTED' }))
  })

  it('update declines participant', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ status: 'NEEDS_ACTION' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ status: 'DECLINED' }) as never)
    await service.update('org_kingston_1', event.id, 'part_1', { status: 'DECLINED' })
    expect(repository.update).toHaveBeenCalledWith('part_1', expect.objectContaining({ status: 'DECLINED' }))
  })

  it('update with DELEGATED sets delegatedTo', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ status: 'NEEDS_ACTION' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ status: 'DELEGATED', delegatedTo: 'user_spanish_town_2' }) as never)
    await service.update('org_kingston_1', event.id, 'part_1', { status: 'DELEGATED', delegatedTo: 'user_spanish_town_2' })
    expect(repository.update).toHaveBeenCalledWith('part_1', expect.objectContaining({ status: 'DELEGATED', delegatedTo: 'user_spanish_town_2' }))
  })

  it('update returns null when participant not found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', event.id, 'missing', { status: 'ACCEPTED' })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove deletes participant', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.remove).mockResolvedValue({ object: 'event_participant', id: 'part_1', deleted: true } as never)
    const result = await service.remove('org_kingston_1', event.id, 'part_1')
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith('part_1')
  })

  it('remove returns null when participant not found and never removes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove('org_kingston_1', event.id, 'missing')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('create returns tenant error when event in other tenant and never creates', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(events.retrieve).mockResolvedValue(err as never)
    const result = await service.create('org_kingston_1', event.id, { kind: 'USER', participantId: 'user_1' })
    expect(result).toEqual(err)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('update with TENTATIVE status persists it', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ status: 'NEEDS_ACTION' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ status: 'TENTATIVE' }) as never)
    await service.update('org_kingston_1', event.id, 'part_1', { status: 'TENTATIVE' })
    expect(repository.update).toHaveBeenCalledWith('part_1', expect.objectContaining({ status: 'TENTATIVE' }))
  })

  it('rejects a participant payload carrying both participantId and email via the real schema', () => {
    expect(() =>
      createWorkEventParticipantInputSchema.parse({
        kind: 'USER',
        participantId: 'user_kingston_1',
        email: 'someone@example.test',
      })
    ).toThrow()
  })

  it('rejects a participant payload carrying neither participantId nor email via the real schema', () => {
    expect(() =>
      createWorkEventParticipantInputSchema.parse({
        kind: 'USER',
      })
    ).toThrow()
  })

  it('accepts an EMAIL participant with email and no participantId via the real schema', () => {
    const parsed = createWorkEventParticipantInputSchema.parse({
      kind: 'EMAIL',
      email: 'claudia@example.test',
      name: 'Claudia Blake',
      role: 'OPTIONAL',
    })
    expect(parsed).toEqual({
      kind: 'EMAIL',
      email: 'claudia@example.test',
      name: 'Claudia Blake',
      role: 'OPTIONAL',
    })
  })

  it('rejects a participant payload with a malformed email via the real schema', () => {
    expect(() =>
      createWorkEventParticipantInputSchema.parse({
        kind: 'EMAIL',
        email: 'not-an-email',
      })
    ).toThrow()
  })

  it('rejects an unknown participant role via the real schema', () => {
    expect(() =>
      createWorkEventParticipantInputSchema.parse({
        kind: 'USER',
        participantId: 'user_kingston_1',
        role: 'ORGANIZER',
      })
    ).toThrow()
  })

  it('rejects an empty participant update payload via the real schema', () => {
    expect(() => updateWorkEventParticipantInputSchema.parse({})).toThrow()
  })

  it('serializes the participant with the object discriminator and Unix timestamps', async () => {
    vi.mocked(repository.list).mockResolvedValue([row({ id: 'part_1' })] as never)
    const result = await service.list('org_kingston_1', event.id) as { data: unknown[] }
    expect(result.data).toEqual([
      {
        object: 'event_participant',
        id: 'part_1',
        eventId: event.id,
        kind: 'USER',
        participantId: 'user_mandeville_1',
        email: null,
        name: 'Asha Brown',
        role: 'REQUIRED',
        status: 'NEEDS_ACTION',
        delegatedTo: null,
        delegatedFrom: null,
        respondedAt: null,
        createdAt: 1_788_091_200,
        updatedAt: 1_788_091_200,
      },
    ])
  })

  it('create with status DELEGATED stamps respondedAt and persists delegatedTo', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ status: 'DELEGATED', delegatedTo: 'user_spanish_town_2', respondedAt: new Date() }) as never
    )
    await service.create('org_kingston_1', event.id, {
      kind: 'USER',
      participantId: 'user_mandeville_1',
      status: 'DELEGATED',
      delegatedTo: 'user_spanish_town_2',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DELEGATED',
        delegatedTo: 'user_spanish_town_2',
        respondedAt: expect.any(Date),
      })
    )
  })

  it('create with default status leaves respondedAt null', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ status: 'NEEDS_ACTION', respondedAt: null }) as never)
    await service.create('org_kingston_1', event.id, { kind: 'USER', participantId: 'user_mandeville_1' })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'NEEDS_ACTION', respondedAt: null })
    )
  })

  it('update resetting to NEEDS_ACTION clears respondedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ status: 'ACCEPTED', respondedAt: new Date() }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ status: 'NEEDS_ACTION' }) as never)
    await service.update('org_kingston_1', event.id, 'part_1', { status: 'NEEDS_ACTION' })
    expect(repository.update).toHaveBeenCalledWith(
      'part_1',
      expect.objectContaining({ status: 'NEEDS_ACTION', respondedAt: null })
    )
  })

  it('update changing the name only leaves the status untouched', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ status: 'ACCEPTED' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ name: 'Asha Brown-Jones' }) as never)
    await service.update('org_kingston_1', event.id, 'part_1', { name: 'Asha Brown-Jones' })
    expect(repository.update).toHaveBeenCalledWith('part_1', { name: 'Asha Brown-Jones' })
  })

  it('update returns event tenant error and never touches the repository', async () => {
    const err = { code: 'work/tenant-inactive', message: 'x', httpStatus: 409 }
    vi.mocked(events.retrieve).mockResolvedValue(err as never)
    const result = await service.update('org_kingston_1', event.id, 'part_1', { status: 'ACCEPTED' })
    expect(result).toEqual(err)
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove returns event tenant error and never removes when event in another tenant', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(events.retrieve).mockResolvedValue(err as never)
    const result = await service.remove('org_kingston_1', event.id, 'part_1')
    expect(result).toEqual(err)
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })
})
