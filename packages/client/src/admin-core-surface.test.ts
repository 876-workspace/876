import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { createCoreSurface } from './composers/base.ts'
import { createWorkspaceControlPlane } from './composers/control-planes.ts'
import { createConsoleClient } from './composers/console.ts'

describe('admin core resource projections', () => {
  it('exposes payment instrument resources only on the server Console surface', () => {
    const options = {
      app: 'console',
      apiKey: '876_app_secret_test1234567890123456',
      services: {
        platformAdmin: {},
        billing: { admin: {}, integration: {} },
        couriers: { admin: {} },
        storage: {},
        widgets: { member: {}, admin: {} },
      },
    } as unknown as Parameters<typeof createConsoleClient>[0]

    const $876 = createConsoleClient(options)

    expect($876.paymentMethods.list).toBeTypeOf('function')
    expect($876.paymentIntents.list).toBeTypeOf('function')
  })

  it('keeps resource reads on core and workspace administration on workspace', () => {
    const platformMemberList = vi.fn()
    const platformAssignmentList = vi.fn()
    const platformInviteList = vi.fn()
    const adminMemberCreate = vi.fn()
    const adminMemberList = vi.fn()
    const adminAssignmentList = vi.fn()
    const adminInviteList = vi.fn()

    const platform = {
      auth: {
        getSession: vi.fn(),
        me: { listSessions: vi.fn(), revokeSession: vi.fn() },
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
      organizationMembers: { list: platformMemberList },
      appAssignments: { list: platformAssignmentList },
      invites: { list: platformInviteList },
      mobileNumbers: {},
      mobileNumberVerifications: {},
      products: {},
    } as unknown as Parameters<typeof createCoreSurface>[0]['platform']
    const admin = {
      auditEvents: {},
      apiKeys: {},
      modules: {},
      provisioning: {
        setups: {
          list: vi.fn(),
          retrieve: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        retrieve: vi.fn(),
        retrievePublished: vi.fn(),
        retrieveCatalog: vi.fn(),
        replaceDraft: vi.fn(),
        validate: vi.fn(),
        publish: vi.fn(),
        runs: {
          list: vi.fn(),
          retrieve: vi.fn(),
          retry: vi.fn(),
          reconcile: vi.fn(),
          claimApplication: vi.fn(),
          completeApplication: vi.fn(),
        },
        notes: {},
      },
      onboarding: {},
      addresses: {},
      reservedUsernames: {},
      billingAccounts: {},
      authAttempts: {},
      devices: {},
      sessions: {},
      appFeatures: {},
      appSubscriptions: {},
      organizationFeatures: {},
      identifications: {},
      messages: {},
      calls: {},
      phoneLookups: {},
      users: {},
      organizations: { subscriptions: {} },
      apps: {},
      memberships: {},
      features: {},
      subscriptions: {},
      roles: {},
      organizationMembers: {
        create: adminMemberCreate,
        list: adminMemberList,
      },
      appAssignments: { list: adminAssignmentList },
      invites: { list: adminInviteList },
    } as unknown as Parameters<typeof createWorkspaceControlPlane>[0]

    const core = createCoreSurface({ platform, admin })
    const workspace = createWorkspaceControlPlane(admin)

    expect(core.organizationMembers.list).toBe(platformMemberList)
    expect(core.organizationMembers.admin.create).toBe(adminMemberCreate)
    expect(core.organizationMembers.admin.list).toBe(adminMemberList)
    expect(core.appAssignments.list).toBe(platformAssignmentList)
    expect('admin' in core.appAssignments).toBe(false)
    expect(workspace.apps.list).toBe(adminAssignmentList)
    expect(core.invites.list).toBe(platformInviteList)
    expect(core.invites.admin.list).toBe(adminInviteList)
  })
})
