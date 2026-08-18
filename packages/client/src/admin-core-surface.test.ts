import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { createCoreSurface } from './composers/base.ts'

describe('admin core resource projections', () => {
  it('preserves platform member methods while exposing internal-key admin namespaces', () => {
    const platformMemberList = vi.fn()
    const platformInviteList = vi.fn()
    const adminMemberList = vi.fn()
    const adminInviteList = vi.fn()

    const platform: any = {
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
      appAssignments: {},
      invites: { list: platformInviteList },
      mobileNumbers: {},
      mobileNumberVerifications: {},
      products: {},
    }
    const admin: any = {
      auditEvents: {},
      apiKeys: {},
      modules: {},
      provisioning: {
        retrievePublished: vi.fn(),
        retrieveCatalog: vi.fn(),
        replaceDraft: vi.fn(),
        runs: {
          claimApplication: vi.fn(),
          completeApplication: vi.fn(),
        },
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
      organizations: {},
      apps: {},
      memberships: {},
      features: {},
      subscriptions: {},
      roles: {},
      organizationMembers: { list: adminMemberList },
      invites: { list: adminInviteList },
    }

    const core = createCoreSurface({ platform, admin }) as any

    expect(core.organizationMembers.list).toBe(platformMemberList)
    expect(core.organizationMembers.admin.list).toBe(adminMemberList)
    expect(core.invites.list).toBe(platformInviteList)
    expect(core.invites.admin.list).toBe(adminInviteList)
  })
})
