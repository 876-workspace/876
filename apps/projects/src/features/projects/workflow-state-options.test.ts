import type { WorkflowState } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}))

// Mirror React.cache's single-flight semantics deterministically: in a real
// request two callers with the same primitive `orgId` share one fetch. The
// JSON key also proves the loader is called with a primitive — an object
// literal argument would never hit a real React.cache entry either.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
      const store = new Map<string, R>()
      return (...args: A): R => {
        const key = JSON.stringify(args)
        if (store.has(key)) return store.get(key) as R
        const result = fn(...args)
        store.set(key, result)
        return result
      }
    },
  }
})

vi.mock('@/lib/clients/projects', () => ({
  projects: { workflowStates: { list: mocks.list } },
}))

const {
  buildIssueStatusOptions,
  loadWorkflowStateOptions,
  resolveIssueStatus,
} = await import('./workflow-state-options')

function makeState(key: string, name: string): WorkflowState {
  return {
    object: 'projects.workflow-state',
    id: `wfs_${key}`,
    tenantId: 'tnt_1',
    key,
    name,
    category: 'todo',
    color: '#000000',
    description: null,
    isDefault: false,
    position: 0,
    archivedAt: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

const STATES = [makeState('todo', 'To do'), makeState('doing', 'Doing')]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildIssueStatusOptions', () => {
  it('lists All states first, then one option per workflow state', () => {
    expect(buildIssueStatusOptions(STATES)).toEqual([
      { value: 'all', label: 'All states' },
      { value: 'todo', label: 'To do' },
      { value: 'doing', label: 'Doing' },
    ])
  })
})

describe('resolveIssueStatus', () => {
  it('keeps a known state key as both the heading value and the query filter', () => {
    expect(resolveIssueStatus('doing', STATES)).toEqual({
      headingValue: 'doing',
      queryStatus: 'doing',
    })
  })

  it('falls back to all with no query filter for an unknown status value', () => {
    expect(resolveIssueStatus('archived', STATES)).toEqual({
      headingValue: 'all',
      queryStatus: undefined,
    })
  })

  it('falls back to all with no query filter when no status is given', () => {
    expect(resolveIssueStatus(undefined, STATES)).toEqual({
      headingValue: 'all',
      queryStatus: undefined,
    })
  })
})

describe('loadWorkflowStateOptions', () => {
  it('is called once per request for two callers with the same org', async () => {
    mocks.list.mockResolvedValue({
      data: { data: STATES },
      error: null,
    })

    const [first, second] = await Promise.all([
      loadWorkflowStateOptions('org_1'),
      loadWorkflowStateOptions('org_1'),
    ])

    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_1')
    expect(first).toEqual({ states: STATES, error: null })
    expect(second).toEqual({ states: STATES, error: null })
  })

  it('returns an empty list with the client error when the fetch fails', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Service is down' },
    })

    await expect(loadWorkflowStateOptions('org_2')).resolves.toEqual({
      states: [],
      error: { code: 'projects/unavailable', message: 'Service is down' },
    })
  })
})
