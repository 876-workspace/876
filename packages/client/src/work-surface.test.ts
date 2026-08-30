import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876ServerClient } from './server'
import { RESOURCE_MANIFEST } from './resource-manifest'

const API_KEY = '876_app_secret_test1234567890123456'
const WORK_URL = 'http://localhost:4020'

function has(surface: unknown, key: string): boolean {
  return typeof surface === 'object' && surface !== null && key in surface
}

function crmWithWorkOptions() {
  return {
    app: 'crm' as const,
    baseUrl: 'http://localhost:4000',
    apiKey: API_KEY,
    accessToken: 'session-access-token',
    services: {
      crm: {
        baseUrl: 'http://localhost:4010',
        internalKey: 'crm-internal',
      },
      work: {
        session: {
          baseUrl: WORK_URL,
          apiKey: API_KEY,
          accessToken: 'session-access-token',
        },
      },
    },
  }
}

function consoleWithWorkOptions() {
  return {
    app: 'console' as const,
    apiKey: API_KEY,
    internalKey: 'internal',
    services: {
      platformAdmin: { internalKey: 'internal', apiKey: API_KEY },
      billing: {
        integration: { internalKey: 'billing-internal' },
        admin: { internalKey: 'billing-internal' },
      },
      couriers: {
        admin: { internalKey: 'couriers-internal', apiKey: API_KEY },
      },
      crm: { internalKey: 'crm-internal' },
      work: {
        operator: { baseUrl: WORK_URL, internalKey: 'work-internal' },
      },
      storage: { internalKey: 'storage-internal' },
      widgets: {
        member: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
        admin: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
      },
    },
  }
}

const sharedWorkResources = [
  'tasks',
  'taskLists',
  'taskLinks',
  'taskAssignments',
  'reminders',
  'recurrenceRules',
  'alerts',
  'calendars',
  'calendarSubscriptions',
  'events',
  'eventParticipants',
  'myWork',
  'workExports',
] as const

describe('Work resource ownership manifest', () => {
  it('registers canonical Work resources under the Work service owner', () => {
    for (const resource of [
      ...sharedWorkResources,
      'workSyncConnections',
      'workSyncMappings',
    ] as const) {
      expect(RESOURCE_MANIFEST[resource].owner, resource).toBe('work')
    }
  })

  it('keeps CRM request projections distinct from canonical Work resources', () => {
    expect(RESOURCE_MANIFEST.requestTasks.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.requestReminders.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.requestEvents.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.tasks.owner).toBe('work')
    expect(RESOURCE_MANIFEST.reminders.owner).toBe('work')
    expect(RESOURCE_MANIFEST.events.owner).toBe('work')
  })
})

describe('CRM Work facade contract', () => {
  it('exposes signed-session Work resources as flat canonical nouns', () => {
    const $876 = create876ServerClient(crmWithWorkOptions())

    for (const resource of sharedWorkResources)
      expect(has($876, resource), `$876.${resource}`).toBe(true)

    expect($876.tasks?.list).toBeTypeOf('function')
    expect($876.tasks?.create).toBeTypeOf('function')
    expect($876.taskAssignments?.create).toBeTypeOf('function')
    expect($876.calendars?.list).toBeTypeOf('function')
    expect($876.events?.create).toBeTypeOf('function')
    expect($876.myWork?.retrieve).toBeTypeOf('function')
    expect($876.workExports?.create).toBeTypeOf('function')

    expect(has($876, 'work')).toBe(false)
    expect(has($876, 'workSyncConnections')).toBe(false)
    expect(has($876, 'workSyncMappings')).toBe(false)
  })

  it('retains contextual CRM request projections beside canonical Work', () => {
    const $876 = create876ServerClient(crmWithWorkOptions())

    expect($876.requestTasks?.list).toBeTypeOf('function')
    expect($876.requestReminders?.list).toBeTypeOf('function')
    expect($876.requestEvents?.list).toBeTypeOf('function')
    expect($876.tasks?.list).toBeTypeOf('function')
    expect($876.reminders?.list).toBeTypeOf('function')
    expect($876.events?.list).toBeTypeOf('function')
  })
})

describe('Console Work facade contract', () => {
  it('exposes the complete operator Work surface without a nested service namespace', () => {
    const $876 = create876ServerClient(consoleWithWorkOptions())

    for (const resource of [
      ...sharedWorkResources,
      'workSyncConnections',
      'workSyncMappings',
    ] as const)
      expect(has($876, resource), `$876.${resource}`).toBe(true)

    expect($876.tasks?.list).toBeTypeOf('function')
    expect($876.taskLinks.create).toBeTypeOf('function')
    expect($876.taskAssignments?.create).toBeTypeOf('function')
    expect($876.calendars?.create).toBeTypeOf('function')
    expect($876.events?.create).toBeTypeOf('function')
    expect($876.workSyncConnections.list).toBeTypeOf('function')
    expect($876.workSyncMappings.list).toBeTypeOf('function')
    expect($876.workExports?.create).toBeTypeOf('function')

    expect(has($876, 'work')).toBe(false)
  })
})
