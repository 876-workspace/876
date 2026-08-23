import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876Client } from './index.ts'
import { create876ServerClient } from './server.ts'
import {
  KNOWN_COLLISIONS,
  RESOURCE_MANIFEST,
  type CanonicalResource,
} from './resource-manifest.ts'

const API_KEY = '876_app_secret_test1234567890123456'

function consoleOptions() {
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
      storage: { internalKey: 'storage-internal' },
      widgets: {
        member: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
        admin: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
      },
    },
  }
}

function couriersOptions() {
  return {
    app: 'couriers' as const,
    apiKey: API_KEY,
    services: {
      couriers: {
        client: { apiKey: API_KEY },
        admin: { internalKey: 'couriers-internal', apiKey: API_KEY },
      },
      storage: { internalKey: 'storage-internal' },
      widgets: {
        member: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
      },
    },
  }
}

function billingOptions() {
  return {
    app: 'billing' as const,
    apiKey: API_KEY,
    services: {
      billing: { tenant: { baseUrl: 'http://localhost:4004' } },
      widgets: {
        member: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
      },
    },
  }
}

function has(surface: unknown, key: string): boolean {
  return typeof surface === 'object' && surface !== null && key in surface
}

describe('resource ownership manifest', () => {
  it('gives every canonical resource an owner and a meaning', () => {
    for (const [name, entry] of Object.entries(RESOURCE_MANIFEST)) {
      expect(entry.owner, `${name}.owner`).toBeTruthy()
      expect(entry.meaning.length, `${name}.meaning`).toBeGreaterThan(0)
    }
  })

  it('records no unresolved facade namespace collisions', () => {
    expect(KNOWN_COLLISIONS.map((c) => c.resource)).toEqual([])
  })

  it('only records collisions for resources that exist in the manifest', () => {
    for (const collision of KNOWN_COLLISIONS) {
      const resource = collision.resource as CanonicalResource
      expect(RESOURCE_MANIFEST[resource]).toBeDefined()
      expect(RESOURCE_MANIFEST[resource].owner).toBe(collision.canonicalOwner)
    }
  })
})

describe('platform surface completeness (regression guard for #255/#256)', () => {
  it('exposes the resources whose omission broke Cloudflare builds', () => {
    const $876 = create876ServerClient({ app: '876', apiKey: API_KEY })

    expect($876.oauthGrants.list).toBeTypeOf('function')
    expect($876.oauthGrants.revoke).toBeTypeOf('function')
    expect($876.auditEvents.create).toBeTypeOf('function')
    expect($876.entitlementPlans.list).toBeTypeOf('function')
    expect(has($876, 'products')).toBe(false)
    expect($876.entitlements.list).toBeTypeOf('function')
    expect($876.mobileNumbers.list).toBeTypeOf('function')
    expect($876.mobileNumberVerifications.create).toBeTypeOf('function')
  })

  it('exposes core identity on every server app surface', () => {
    const surfaces = [
      create876ServerClient(consoleOptions()),
      create876ServerClient(couriersOptions()),
      create876ServerClient(billingOptions()),
      create876ServerClient({ app: 'enterprise', apiKey: API_KEY }),
    ]
    for (const $876 of surfaces) {
      expect($876.auth).toBeDefined()
      expect($876.sessions).toBeDefined()
      expect($876.sessions.me.retrieve).toBeTypeOf('function')
      expect($876.sessions.me.list).toBeTypeOf('function')
      expect($876.sessions.me.revoke).toBeTypeOf('function')
      expect($876.users.me).toBeDefined()
      expect($876.organizations).toBeDefined()
      expect($876.apps).toBeDefined()
      expect($876.entitlements).toBeDefined()
    }
  })

  it('preserves admin sessions at root while exposing me and admin namespaces on console', () => {
    const $876 = create876ServerClient(consoleOptions())

    expect($876.sessions.me.retrieve).toBeTypeOf('function')
    expect($876.sessions.me.list).toBeTypeOf('function')
    expect($876.sessions.me.revoke).toBeTypeOf('function')

    expect($876.sessions.admin.list).toBeTypeOf('function')
    expect($876.sessions.admin.retrieve).toBeTypeOf('function')
    expect($876.sessions.admin.revoke).toBeTypeOf('function')
    expect($876.sessions.admin.revokeForUser).toBeTypeOf('function')

    expect($876.sessions.list).toBeTypeOf('function')
    expect($876.sessions.retrieve).toBeTypeOf('function')
    expect($876.sessions.revoke).toBeTypeOf('function')
    expect($876.sessions.revokeForUser).toBeTypeOf('function')
  })

  it('exposes provisioning nested aliases on console', () => {
    const $876 = create876ServerClient(consoleOptions())
    expect($876.provisioning.retrieve).toBeTypeOf('function')
    expect($876.provisioning.published.retrieve).toBeTypeOf('function')
    expect($876.provisioning.catalog.retrieve).toBeTypeOf('function')
    expect($876.provisioning.draft.update).toBeTypeOf('function')
    expect($876.provisioning.runs.claim).toBeTypeOf('function')
    expect($876.provisioning.runs.complete).toBeTypeOf('function')
    expect($876.provisioning.retrievePublished).toBeTypeOf('function')
    expect($876.provisioning.retrieveCatalog).toBeTypeOf('function')
    expect($876.provisioning.replaceDraft).toBeTypeOf('function')
    expect($876.provisioning.runs.claimApplication).toBeTypeOf('function')
    expect($876.provisioning.runs.completeApplication).toBeTypeOf('function')
  })
})

describe('per-app resource boundaries (no cross-app leakage)', () => {
  it('billing exposes finance resources and never courier resources', () => {
    const $876 = create876ServerClient(billingOptions())
    expect($876.invoices).toBeDefined()
    expect($876.payments).toBeDefined()
    expect($876.paymentMethods).toBeDefined()
    expect($876.paymentIntents).toBeDefined()
    expect($876.customers).toBeDefined()
    expect($876.subscriptions).toBeDefined()
    expect($876.products.list).toBeTypeOf('function')
    expect(has($876, 'packages')).toBe(false)
    expect(has($876, 'branches')).toBe(false)
  })

  it('couriers exposes logistics resources and never billing documents', () => {
    const $876 = create876ServerClient(couriersOptions())
    expect($876.packages).toBeDefined()
    expect($876.mailboxes).toBeDefined()
    expect($876.customers).toBeDefined()
    expect(has($876, 'invoices')).toBe(false)
    expect(has($876, 'payments')).toBe(false)
    expect(has($876, 'subscriptions')).toBe(false)
  })
})

describe('browser surface never leaks server-only resources', () => {
  it('omits storage, billing documents, courier logistics and admin', () => {
    const browser = create876Client()
    for (const forbidden of [
      'files',
      'uploads',
      'packages',
      'invoices',
      'payments',
      'paymentMethods',
      'paymentIntents',
      'products',
      'storage',
      'billing',
      'couriers',
      'admin',
    ]) {
      expect(has(browser, forbidden), `browser.${forbidden}`).toBe(false)
    }
  })

  it('accepts an app id without forwarding it to the strict SDK options schema', () => {
    expect(() => create876Client({ app: 'console' })).not.toThrow()
    const browser = create876Client({ app: 'enterprise' })
    expect(browser.auth).toBeDefined()
    expect(has(browser, 'app')).toBe(false)
  })

  it('exposes self sessions on browser without admin or legacy admin roots', () => {
    const browser = create876Client()
    expect(browser.sessions.me.retrieve).toBeTypeOf('function')
    expect(browser.sessions.me.list).toBeTypeOf('function')
    expect(browser.sessions.me.revoke).toBeTypeOf('function')
    expect('admin' in browser.sessions).toBe(false)
    expect('list' in browser.sessions).toBe(false)
    expect('retrieve' in browser.sessions).toBe(false)
    expect('revoke' in browser.sessions).toBe(false)
  })
})

describe('facade delegation parity', () => {
  it('sessions.me delegates to underlying SDK auth methods', async () => {
    const getSession = vi
      .fn()
      .mockResolvedValue({ data: { object: 'session' }, error: null })
    const listSessions = vi.fn().mockResolvedValue({ data: [], error: null })
    const revokeSession = vi
      .fn()
      .mockResolvedValue({ data: { object: 'session' }, error: null })

    const { createCoreSurface } = await import('./composers/base.ts')
    const platform: any = {
      auth: {
        getSession,
        me: { listSessions, revokeSession },
        login: vi.fn(),
        logout: vi.fn(),
      },
      oauth: {},
      oauthGrants: {},
      auditEvents: {},
      users: {},
      organizations: {},
      apps: {},
      memberships: {},
      features: {},
      subscriptions: {},
      locations: {},
      contacts: {},
      departments: {},
      employees: {},
      roles: {},
      permissions: {},
      organizationMembers: {},
      appAssignments: {},
      invites: {},
      mobileNumbers: {},
      mobileNumberVerifications: {},
      products: {},
    }
    const core = createCoreSurface({ platform }) as any
    await core.sessions.me.retrieve()
    expect(getSession).toHaveBeenCalledTimes(1)
    await core.sessions.me.list()
    expect(listSessions).toHaveBeenCalledTimes(1)
    await core.sessions.me.revoke('session_123')
    expect(revokeSession).toHaveBeenCalledTimes(1)
    expect(revokeSession).toHaveBeenCalledWith('session_123')
  })

  it('provisioning aliases delegate and admin session compatibility preserves references', async () => {
    const retrieve = vi.fn()
    const retrievePublished = vi.fn()
    const retrieveCatalog = vi.fn()
    const replaceDraft = vi.fn()
    const validate = vi.fn()
    const publish = vi.fn()
    const runsList = vi.fn()
    const runsRetrieve = vi.fn()
    const runsRetry = vi.fn()
    const claimApplication = vi.fn()
    const completeApplication = vi.fn()
    const reconcile = vi.fn()
    const notesList = vi.fn()
    const notesCreate = vi.fn()
    const notesDelete = vi.fn()
    const provisioning: any = {
      retrieve,
      retrievePublished,
      retrieveCatalog,
      replaceDraft,
      validate,
      publish,
      runs: {
        list: runsList,
        retrieve: runsRetrieve,
        retry: runsRetry,
        claimApplication,
        completeApplication,
        reconcile,
      },
      notes: {
        list: notesList,
        create: notesCreate,
        delete: notesDelete,
      },
    }
    const getSession = vi.fn()
    const listSessions = vi.fn()
    const revokeSession = vi.fn()
    const { createCoreSurface } = await import('./composers/base.ts')
    const platform: any = {
      auth: { getSession, me: { listSessions, revokeSession } },
      oauth: {},
      oauthGrants: {},
      auditEvents: {},
      users: {},
      organizations: {},
      apps: {},
      memberships: {},
      features: {},
      subscriptions: {},
      locations: {},
      contacts: {},
      departments: {},
      employees: {},
      roles: {},
      permissions: {},
      organizationMembers: {},
      appAssignments: {},
      invites: {},
      mobileNumbers: {},
      mobileNumberVerifications: {},
      products: {},
    }
    const adminSessions = {
      list: vi.fn(),
      retrieve: vi.fn(),
      revoke: vi.fn(),
      revokeForUser: vi.fn(),
    }
    const admin: any = {
      auditEvents: {},
      apiKeys: {},
      modules: {},
      provisioning,
      onboarding: {},
      addresses: {},
      reservedUsernames: {},
      billingAccounts: {},
      authAttempts: {},
      devices: {},
      sessions: adminSessions,
      appFeatures: {},
      appSubscriptions: {},
      organizationFeatures: {},
      identifications: {},
      messages: {},
      calls: {},
      phoneLookups: {},
      users: {},
      organizations: {},
      apps: {},
      memberships: {},
      features: {},
      subscriptions: {},
      roles: {},
    }
    const core = createCoreSurface({ platform, admin }) as any

    expect(core.sessions.list).toBe(adminSessions.list)
    expect(core.sessions.retrieve).toBe(adminSessions.retrieve)
    expect(core.sessions.revoke).toBe(adminSessions.revoke)
    expect(core.sessions.revokeForUser).toBe(adminSessions.revokeForUser)

    expect(core.sessions.admin.list).toBe(adminSessions.list)
    expect(core.sessions.admin.retrieve).toBe(adminSessions.retrieve)
    expect(core.sessions.admin.revoke).toBe(adminSessions.revoke)
    expect(core.sessions.admin.revokeForUser).toBe(adminSessions.revokeForUser)

    expect(core.sessions.me.retrieve).toBe(getSession)
    expect(core.sessions.me.list).toBe(listSessions)
    expect(core.sessions.me.revoke).toBe(revokeSession)

    await core.provisioning.published.retrieve('application', 'app_123')
    expect(retrievePublished).toHaveBeenCalledTimes(1)
    expect(retrievePublished).toHaveBeenCalledWith('application', 'app_123')

    await core.provisioning.catalog.retrieve('application', 'app_123')
    expect(retrieveCatalog).toHaveBeenCalledTimes(1)
    expect(retrieveCatalog).toHaveBeenCalledWith('application', 'app_123')

    await core.provisioning.draft.update('application', 'app_123', {
      foo: 'bar',
    } as any)
    expect(replaceDraft).toHaveBeenCalledTimes(1)
    expect(replaceDraft).toHaveBeenCalledWith('application', 'app_123', {
      foo: 'bar',
    })

    await core.provisioning.runs.claim({
      organizationId: 'org_1',
      appId: 'app_1',
    } as any)
    expect(claimApplication).toHaveBeenCalledTimes(1)
    expect(claimApplication).toHaveBeenCalledWith({
      organizationId: 'org_1',
      appId: 'app_1',
    })

    await core.provisioning.runs.complete('run_123', {
      status: 'succeeded',
    } as any)
    expect(completeApplication).toHaveBeenCalledTimes(1)
    expect(completeApplication).toHaveBeenCalledWith('run_123', {
      status: 'succeeded',
    })

    expect(core.provisioning.retrievePublished).toBe(retrievePublished)
    expect(core.provisioning.retrieveCatalog).toBe(retrieveCatalog)
    expect(core.provisioning.replaceDraft).toBe(replaceDraft)
    expect(core.provisioning.runs.claimApplication).toBe(claimApplication)
    expect(core.provisioning.runs.completeApplication).toBe(completeApplication)
  })
})
