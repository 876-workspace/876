import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876Client } from './index.ts'
import { create876ServerClient, createConsoleSurfaces } from './server.ts'
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
      crm: { internalKey: 'crm-internal' },
      work: { operator: { internalKey: 'work-internal' } },
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

  it('separates resource, workspace, and operator control planes on console', () => {
    const { $876, workspace, platform } =
      createConsoleSurfaces(consoleOptions())

    for (const controlOnly of [
      'provisioning',
      'onboarding',
      'modules',
      'organizationFeatures',
      'apiKeys',
      'authAttempts',
      'devices',
      'appFeatures',
      'reservedUsernames',
    ])
      expect(has($876, controlOnly), `$876.${controlOnly}`).toBe(false)

    expect(workspace.provisioning.setups.list).toBeTypeOf('function')
    expect(workspace.provisioning.setups.create).toBeTypeOf('function')
    expect(workspace.provisioning.setups.update).toBeTypeOf('function')
    expect(workspace.provisioning.published.retrieve).toBeTypeOf('function')
    expect(workspace.provisioning.catalog.retrieve).toBeTypeOf('function')
    expect(workspace.provisioning.draft.retrieve).toBeTypeOf('function')
    expect(workspace.provisioning.draft.update).toBeTypeOf('function')
    expect(workspace.provisioning.draft.validate).toBeTypeOf('function')
    expect(workspace.provisioning.draft.publish).toBeTypeOf('function')
    expect(workspace.provisioning.runs.claim).toBeTypeOf('function')
    expect(workspace.provisioning.runs.complete).toBeTypeOf('function')
    expect(workspace.onboarding.retrieve).toBeTypeOf('function')
    expect(workspace.modules.list).toBeTypeOf('function')
    expect(workspace.features.grant).toBeTypeOf('function')
    expect(workspace.apps.list).toBeTypeOf('function')
    expect(workspace.apps.assign).toBeTypeOf('function')
    expect(workspace.apps.unassign).toBeTypeOf('function')
    expect(workspace.apps.entitlements.list).toBeTypeOf('function')
    expect(workspace.apps.entitlements.retrieve).toBeTypeOf('function')
    expect(workspace.apps.entitlements.grant).toBeTypeOf('function')
    expect(workspace.apps.entitlements.update).toBeTypeOf('function')

    // Org-to-app entitlement administration has exactly one path. Billing's
    // own subscription records are a different resource and stay on `$876`.
    expect(has($876.organizations.admin, 'subscriptions')).toBe(false)
    expect($876.subscriptions.admin.retrieve).toBeTypeOf('function')

    expect(platform.apiKeys.create).toBeTypeOf('function')
    expect(platform.authAttempts.list).toBeTypeOf('function')
    expect(platform.devices.retrieve).toBeTypeOf('function')
    expect(platform.appFeatures.list).toBeTypeOf('function')
    expect(platform.reservedUsernames.list).toBeTypeOf('function')
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
      'workspace',
      'platform',
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
    const platform = {
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
    } as unknown as Parameters<typeof createCoreSurface>[0]['platform']
    const core = createCoreSurface({ platform })
    await core.sessions.me.retrieve()
    expect(getSession).toHaveBeenCalledTimes(1)
    await core.sessions.me.list()
    expect(listSessions).toHaveBeenCalledTimes(1)
    await core.sessions.me.revoke('session_123')
    expect(revokeSession).toHaveBeenCalledTimes(1)
    expect(revokeSession).toHaveBeenCalledWith('session_123')
  })

  it('control-plane aliases delegate while admin session compatibility stays intact', async () => {
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
    const setups = {
      list: vi.fn(),
      retrieve: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }
    const provisioning = {
      setups,
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
    const { createWorkspaceControlPlane, createPlatformControlPlane } =
      await import('./composers/control-planes.ts')
    const platformClient = {
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
    } as unknown as Parameters<typeof createCoreSurface>[0]['platform']
    const adminSessions = {
      list: vi.fn(),
      retrieve: vi.fn(),
      revoke: vi.fn(),
      revokeForUser: vi.fn(),
    }
    const assignmentCreate = vi.fn()
    const assignmentRevoke = vi.fn()
    const apiKeyCreate = vi.fn()
    const entitlementGrant = vi.fn()
    const admin = {
      auditEvents: {},
      apiKeys: { create: apiKeyCreate },
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
      organizations: {
        subscriptions: {
          list: vi.fn(),
          retrieve: vi.fn(),
          create: entitlementGrant,
          update: vi.fn(),
        },
      },
      apps: {},
      memberships: {},
      features: {},
      subscriptions: {},
      roles: {},
      organizationMembers: {},
      appAssignments: {
        list: vi.fn(),
        create: assignmentCreate,
        revoke: assignmentRevoke,
      },
      invites: {},
    } as unknown as Parameters<typeof createWorkspaceControlPlane>[0]
    const core = createCoreSurface({ platform: platformClient, admin })
    const workspace = createWorkspaceControlPlane(admin)
    const platform = createPlatformControlPlane(admin)

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

    expect(has(core, 'provisioning')).toBe(false)
    expect(has(core, 'apiKeys')).toBe(false)

    await workspace.provisioning.published.retrieve('application', 'app_123')
    expect(retrievePublished).toHaveBeenCalledTimes(1)
    expect(retrievePublished).toHaveBeenCalledWith('application', 'app_123')

    await workspace.provisioning.catalog.retrieve('application', 'app_123')
    expect(retrieveCatalog).toHaveBeenCalledTimes(1)
    expect(retrieveCatalog).toHaveBeenCalledWith('application', 'app_123')

    await workspace.provisioning.draft.update('application', 'app_123', {
      foo: 'bar',
    } as unknown as Parameters<typeof workspace.provisioning.draft.update>[2])
    expect(replaceDraft).toHaveBeenCalledTimes(1)
    expect(replaceDraft).toHaveBeenCalledWith('application', 'app_123', {
      foo: 'bar',
    })

    await workspace.provisioning.runs.claim({
      organizationId: 'org_1',
      appId: 'app_1',
    } as unknown as Parameters<typeof workspace.provisioning.runs.claim>[0])
    expect(claimApplication).toHaveBeenCalledTimes(1)
    expect(claimApplication).toHaveBeenCalledWith({
      organizationId: 'org_1',
      appId: 'app_1',
    })

    await workspace.provisioning.runs.complete('run_123', {
      status: 'succeeded',
    } as unknown as Parameters<typeof workspace.provisioning.runs.complete>[1])
    expect(completeApplication).toHaveBeenCalledTimes(1)
    expect(completeApplication).toHaveBeenCalledWith('run_123', {
      status: 'succeeded',
    })

    expect(workspace.apps.assign).toBe(assignmentCreate)
    expect(workspace.apps.unassign).toBe(assignmentRevoke)
    expect(workspace.apps.entitlements.grant).toBe(entitlementGrant)
    expect(has(core.organizations.admin, 'subscriptions')).toBe(false)
    expect(platform.apiKeys.create).toBe(apiKeyCreate)
  })
})
