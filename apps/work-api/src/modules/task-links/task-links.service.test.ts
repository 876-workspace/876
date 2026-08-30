import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWorkTaskLinkInputSchema } from '@876/work'

vi.mock('../tasks/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('./task-links.repository.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}))

import * as tasks from '../tasks/index.js'
import * as repository from './task-links.repository.js'
import * as service from './task-links.service.js'

const task = { id: 'task_kingston_1', organizationId: 'org_kingston_1' }

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link_1',
    taskId: task.id,
    service: 'crm',
    resource: 'request',
    externalId: 'req_mandeville_1',
    label: 'CRM Request',
    url: 'https://example.test/requests/1',
    isPrimary: false,
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tasks.retrieve).mockResolvedValue(task as never)
  vi.mocked(repository.list).mockResolvedValue([])
})

describe('Work task-links service', () => {
  it('first link isPrimary defaults to true when no existing links', async () => {
    vi.mocked(repository.list).mockResolvedValue([])
    vi.mocked(repository.create).mockResolvedValue(
      row({ isPrimary: true }) as never
    )
    const result = await service.create('org_kingston_1', task.id, {
      service: 'crm',
      resource: 'request',
      externalId: 'req_1',
    })
    expect(result).toEqual(expect.objectContaining({ isPrimary: true }))
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isPrimary: true })
    )
  })

  it('second link defaults to isPrimary false', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ isPrimary: true }),
    ] as never)
    vi.mocked(repository.create).mockResolvedValue(
      row({ isPrimary: false }) as never
    )
    await service.create('org_kingston_1', task.id, {
      service: 'crm',
      resource: 'request',
      externalId: 'req_2',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isPrimary: false })
    )
  })

  it('explicit isPrimary true is persisted', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ isPrimary: true }),
    ] as never)
    vi.mocked(repository.create).mockResolvedValue(
      row({ isPrimary: true }) as never
    )
    await service.create('org_kingston_1', task.id, {
      service: 'crm',
      resource: 'request',
      externalId: 'req_3',
      isPrimary: true,
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isPrimary: true })
    )
  })

  it('creates link with CRM triple stored exactly', async () => {
    vi.mocked(repository.list).mockResolvedValue([])
    vi.mocked(repository.create).mockResolvedValue(
      row({
        service: 'crm',
        resource: 'request',
        externalId: 'req_99',
      }) as never
    )
    await service.create('org_kingston_1', task.id, {
      service: 'crm',
      resource: 'request',
      externalId: 'req_99',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'crm',
        resource: 'request',
        externalId: 'req_99',
      })
    )
  })

  it('link to external service not owned by CRM is stored verbatim', async () => {
    vi.mocked(repository.list).mockResolvedValue([])
    vi.mocked(repository.create).mockResolvedValue(
      row({
        service: 'external',
        resource: 'ticket',
        externalId: 'ext_1',
      }) as never
    )
    const result = await service.create('org_kingston_1', task.id, {
      service: 'external',
      resource: 'ticket',
      externalId: 'ext_1',
    })
    expect(result).toEqual(expect.objectContaining({ service: 'external' }))
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'external', resource: 'ticket' })
    )
  })

  it('list returns links for task', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'link_a' }),
      row({ id: 'link_b' }),
    ] as never)
    const result = (await service.list('org_kingston_1', task.id)) as {
      data: unknown[]
    }
    expect(result.data).toHaveLength(2)
    expect(repository.list).toHaveBeenCalledWith(task.id)
  })

  it('list returns tenant error when task not in tenant and never lists', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.retrieve).mockResolvedValue(err as never)
    const result = await service.list('org_kingston_1', task.id)
    expect(result).toEqual(err)
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('create returns task tenant error and never creates when task in another tenant', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.retrieve).mockResolvedValue(err as never)
    const result = await service.create('org_kingston_1', task.id, {
      service: 'crm',
      resource: 'request',
      externalId: 'req_1',
    })
    expect(result).toEqual(err)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('remove deletes a link', async () => {
    vi.mocked(repository.remove).mockResolvedValue({
      object: 'task_link',
      id: 'link_1',
      deleted: true,
    } as never)
    const result = await service.remove('org_kingston_1', task.id, 'link_1')
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith(task.id, 'link_1')
  })

  it('remove primary link succeeds', async () => {
    vi.mocked(repository.remove).mockResolvedValue({
      object: 'task_link',
      id: 'link_primary',
      deleted: true,
    } as never)
    const result = await service.remove(
      'org_kingston_1',
      task.id,
      'link_primary'
    )
    expect(result).toEqual(expect.objectContaining({ id: 'link_primary' }))
  })

  it('create returns null when task not found and never creates', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue(null as never)
    const result = await service.create('org_kingston_1', 'missing', {
      service: 'crm',
      resource: 'request',
      externalId: 'req_1',
    })
    expect(result).toBeNull()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('list returns null when task not found and never hits repository', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue(null as never)
    const result = await service.list('org_kingston_1', 'missing')
    expect(result).toBeNull()
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('remove returns tenant error when task in other tenant and never removes', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.retrieve).mockResolvedValue(err as never)
    const result = await service.remove('org_kingston_1', task.id, 'link_1')
    expect(result).toEqual(err)
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('remove returns null when task not found and never removes', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue(null as never)
    const result = await service.remove('org_kingston_1', 'missing', 'link_1')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('serializes the link with object discriminator and Unix-second createdAt', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'link_1', isPrimary: true }),
    ] as never)
    const result = (await service.list('org_kingston_1', task.id)) as {
      data: unknown[]
    }
    expect(result.data).toEqual([
      {
        object: 'task_link',
        id: 'link_1',
        taskId: task.id,
        service: 'crm',
        resource: 'request',
        externalId: 'req_mandeville_1',
        label: 'CRM Request',
        url: 'https://example.test/requests/1',
        isPrimary: true,
        createdAt: 1_788_091_200,
      },
    ])
  })

  it('create stores label and url when provided', async () => {
    vi.mocked(repository.list).mockResolvedValue([])
    vi.mocked(repository.create).mockResolvedValue(
      row({
        label: 'CRM Request',
        url: 'https://example.test/requests/1',
      }) as never
    )
    await service.create('org_kingston_1', task.id, {
      service: 'crm',
      resource: 'request',
      externalId: 'req_1',
      label: 'CRM Request',
      url: 'https://example.test/requests/1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'CRM Request',
        url: 'https://example.test/requests/1',
      })
    )
  })

  it('create defaults label and url to null', async () => {
    vi.mocked(repository.list).mockResolvedValue([])
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_kingston_1', task.id, {
      service: 'crm',
      resource: 'request',
      externalId: 'req_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ label: null, url: null })
    )
  })

  it('accepts a link payload with the full CRM triple via the real schema', () => {
    const parsed = createWorkTaskLinkInputSchema.parse({
      service: 'crm',
      resource: 'request',
      externalId: 'req_mandeville_1',
      label: 'CRM Request',
      url: 'https://example.test/requests/1',
      isPrimary: true,
    })
    expect(parsed).toEqual({
      service: 'crm',
      resource: 'request',
      externalId: 'req_mandeville_1',
      label: 'CRM Request',
      url: 'https://example.test/requests/1',
      isPrimary: true,
    })
  })

  it('rejects a link payload missing the resource of the triple via the real schema', () => {
    expect(() =>
      createWorkTaskLinkInputSchema.parse({
        service: 'crm',
        externalId: 'req_1',
      })
    ).toThrow()
  })

  it('rejects a link payload with a non-URL url via the real schema', () => {
    expect(() =>
      createWorkTaskLinkInputSchema.parse({
        service: 'crm',
        resource: 'request',
        externalId: 'req_1',
        url: 'not-a-url',
      })
    ).toThrow()
  })

  it('rejects a link payload with an unknown extra field via the real schema', () => {
    expect(() =>
      createWorkTaskLinkInputSchema.parse({
        service: 'crm',
        resource: 'request',
        externalId: 'req_1',
        colour: 'red',
      })
    ).toThrow()
  })

  it('create returns null when task not found and never lists existing links', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue(null as never)
    const result = await service.create('org_kingston_1', 'missing', {
      service: 'crm',
      resource: 'request',
      externalId: 'req_1',
    })
    expect(result).toBeNull()
    expect(repository.list).not.toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
  })
})
