import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks — follow goldbergyoni "mock only the boundary, isolate per test" ──
const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthSession: vi.fn(),
  listRouting: vi.fn(),
  usersRetrieve: vi.fn(),
  featuresEvaluate: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('./session', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getAuthSession: mocks.getAuthSession,
    isSignedSession: actual.isSignedSession as unknown,
  }
})
vi.mock('@/lib/services/workspace', () => ({
  getWorkspace: vi.fn(async () => ({
    memberships: { list: mocks.listRouting },
    features: { evaluate: mocks.featuresEvaluate },
  })),
}))
vi.mock('@/lib/services/account-server', () => ({
  getAccount: vi.fn(async () => ({
    users: { retrieve: mocks.usersRetrieve },
  })),
}))
vi.mock('@sentry/nextjs', () => ({ captureMessage: mocks.captureMessage }))

// SUT — imported after mocks so the mocked boundaries are in place
import {
  findActiveOrgMembership,
  findAuthRoutingUser,
  getEnabledEnterpriseFeatureSlugs,
  hasOrgPermission,
  requireActiveUser,
  requireEnterpriseFeature,
  requireOrgMembership,
  requireOrgPermission,
  requireSession,
  resolveHomePathForUser,
  resolvePrimaryOrganizationPath,
} from './guards'

function redirectError(path: string): Error & { path: string; digest: string } {
  const err = Object.assign(new Error(`NEXT_REDIRECT:${path}`), {
    path,
    digest: `NEXT_REDIRECT;${path}`,
  })
  return err as never
}

function sessionUser(
  overrides: Partial<{ id: string; realm: string; crossRealm: boolean }> = {}
) {
  return {
    id: 'user_1',
    email: 'a@b.co',
    realm: 'enterprise',
    crossRealm: false,
    firstName: 'A',
    lastName: 'B',
    emailVerified: true,
    avatar: null,
    username: 'a',
    ...overrides,
  }
}

function signedSession(user = sessionUser()) {
  return { user, accessToken: 'tok' }
}

function membershipRow(
  overrides: Partial<{ slug: string; status: string; orgStatus: string }> = {}
) {
  const slug = overrides.slug ?? 'acme'
  return {
    id: 'mem_1',
    role: 'super_admin',
    status: overrides.status ?? 'active',
    permissions: ['org:read', 'members:read'],
    organization: {
      id: 'org_1',
      name: 'Acme',
      slug,
      status: overrides.orgStatus ?? 'active',
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.usersRetrieve.mockReset()
  mocks.redirect.mockImplementation((path: string) => {
    throw redirectError(path)
  })
  mocks.getAuthSession.mockResolvedValue(signedSession())
  mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
  mocks.featuresEvaluate.mockResolvedValue({ data: [], error: null })
})

// ──────────────────────────────────────────────────────────────
// requireSession — realm gate, the Edge-proxy replacement
// ──────────────────────────────────────────────────────────────
describe('requireSession', () => {
  it('returns user when session is enterprise realm', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'enterprise' }))
    )
    const user = await requireSession('/dashboard')
    expect(user.id).toBe('user_1')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('blocks a consumer realm from Enterprise', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'consumer', crossRealm: false }))
    )
    await expect(requireSession('/')).rejects.toMatchObject({
      path: '/access-denied',
    })
  })

  it('allows cross-realm consumer to pass', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'consumer', crossRealm: true }))
    )
    const user = await requireSession('/')
    expect(user.id).toBe('user_1')
  })

  it('redirects unauthenticated to /login with returnTo', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: null } as never)
    await expect(requireSession('/protected')).rejects.toMatchObject({
      path: expect.stringContaining('/login'),
    })
    const path = (mocks.redirect.mock.calls[0]?.[0] as string) ?? ''
    expect(path).toContain('/login')
    expect(path).toContain(encodeURIComponent('/protected'))
  })

  it('includes AUTH_RETURN_TO_PARAM in login URL', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: null } as never)
    await expect(requireSession('/onboarding')).rejects.toThrow()
    const url = mocks.redirect.mock.calls[0]?.[0] as string
    expect(url).toMatch(/returnTo|return_to|next/i)
  })

  it.each([
    ['enterprise' as const, false, false],
    ['consumer' as const, false, true],
    ['consumer' as const, true, false],
  ])(
    'realm=%s crossRealm=%s → redirects=%s',
    async (realm, crossRealm, shouldRedirect) => {
      mocks.getAuthSession.mockResolvedValue(
        signedSession(sessionUser({ realm, crossRealm }))
      )
      if (shouldRedirect)
        await expect(requireSession('/')).rejects.toMatchObject({
          path: '/access-denied',
        })
      else await expect(requireSession('/')).resolves.toBeDefined()
    }
  )
})

// ──────────────────────────────────────────────────────────────
// findAuthRoutingUser — dual lookup (id then workosId)
// ──────────────────────────────────────────────────────────────
describe('findAuthRoutingUser', () => {
  it('returns null when user not found by id nor workosId', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    await expect(findAuthRoutingUser('user_1')).resolves.toBeNull()
  })

  it('returns user when found by primary id', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: 'B',
        avatar: null,
      },
      error: null,
    })
    const user = await findAuthRoutingUser('user_1')
    expect(user?.id).toBe('user_1')
    expect(mocks.usersRetrieve).toHaveBeenCalledTimes(1)
  })

  it('returns null when the signed-in account is absent', async () => {
    mocks.usersRetrieve.mockResolvedValueOnce({ data: null, error: null })
    const user = await findAuthRoutingUser('workos_123')
    expect(user).toBeNull()
    expect(mocks.usersRetrieve).toHaveBeenCalledTimes(1)
  })

  it('returns null when row missing required id or email', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: { id: null, email: null },
      error: null,
    })
    await expect(findAuthRoutingUser('user_1')).resolves.toBeNull()
  })

  it('maps snake_case fields to camelCase', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'First',
        last_name: 'Last',
        avatar: 'https://img',
      },
      error: null,
    })
    const user = await findAuthRoutingUser('user_1')
    expect(user?.firstName).toBe('First')
    expect(user?.avatar).toBe('https://img')
  })

  it('throws when platform returns error envelope (does not swallow server error)', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'boom' },
    })
    await expect(findAuthRoutingUser('user_1')).rejects.toBeDefined()
  })
})

// ──────────────────────────────────────────────────────────────
// requireActiveUser — banned / inactive guards
// ──────────────────────────────────────────────────────────────
describe('requireActiveUser', () => {
  it('returns active unbanned user', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    const user = await requireActiveUser('user_1')
    expect(user.id).toBe('user_1')
  })

  it('redirects an unknown session user to Enterprise login', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    await expect(requireActiveUser('missing')).rejects.toMatchObject({
      path: '/login?returnTo=%2F',
    })
  })

  it('redirects banned user to /suspended', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: true,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    await expect(requireActiveUser('user_1')).rejects.toMatchObject({
      path: expect.stringContaining('/suspended'),
    })
  })

  it('redirects inactive user to /suspended', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'blocked',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    await expect(requireActiveUser('user_1')).rejects.toMatchObject({
      path: expect.stringContaining('/suspended'),
    })
  })
})

// ──────────────────────────────────────────────────────────────
// requireOrgMembership — the diff's core routing change: redirects to '/' never /no-access
// ──────────────────────────────────────────────────────────────
describe('requireOrgMembership', () => {
  it('returns user + membership when active membership exists', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    const result = await requireOrgMembership('user_1', 'acme')
    expect(result.membership.organization.slug).toBe('acme')
    expect(result.user.id).toBe('user_1')
  })

  it('redirects to "/" (not /no-access) when membership missing — the diff invariant', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(requireOrgMembership('user_1', 'acme')).rejects.toMatchObject({
      path: '/',
    })
    expect(mocks.redirect).toHaveBeenCalledWith('/')
    expect(mocks.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining('no-access')
    )
  })

  it('redirects an unknown session user to Enterprise login', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    await expect(requireOrgMembership('unknown', 'acme')).rejects.toMatchObject(
      { path: '/login?returnTo=%2Facme' }
    )
  })

  it('scopes lookup to slug + status active', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    await requireOrgMembership('user_1', 'acme')
    expect(mocks.listRouting).toHaveBeenCalledWith({ status: 'active' })
  })

  it('findActiveOrgMembership returns null (not redirect) when missing — route-handler contract', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(findActiveOrgMembership('user_1', 'acme')).resolves.toBeNull()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('findActiveOrgMembership returns membership when present', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    const m = await findActiveOrgMembership('user_1', 'acme')
    expect(m?.organization.slug).toBe('acme')
  })
})

// ──────────────────────────────────────────────────────────────
// hasOrgPermission & requireOrgPermission
// ──────────────────────────────────────────────────────────────
describe('hasOrgPermission / requireOrgPermission', () => {
  it('hasOrgPermission returns true when permission present', () => {
    expect(
      hasOrgPermission(
        { permissions: ['org:read', 'members:read'] },
        'members:read'
      )
    ).toBe(true)
  })
  it('hasOrgPermission returns false when missing', () => {
    expect(
      hasOrgPermission({ permissions: ['org:read'] }, 'billing:manage')
    ).toBe(false)
  })
  it('requireOrgPermission passes when permission present', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    const result = await requireOrgPermission('user_1', 'acme', 'org:read')
    expect(result.membership.permissions).toContain('org:read')
  })
  it('requireOrgPermission redirects to /<slug> when permission missing', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          { ...membershipRow({ slug: 'acme' }), permissions: ['org:read'] },
        ],
      },
      error: null,
    })
    await expect(
      requireOrgPermission('user_1', 'acme', 'billing:manage')
    ).rejects.toMatchObject({ path: '/acme' })
  })
})

// ──────────────────────────────────────────────────────────────
// resolvePrimaryOrganizationPath & resolveHomePathForUser
// ──────────────────────────────────────────────────────────────
describe('resolvePrimaryOrganizationPath', () => {
  it('returns /<slug>/profile for first active org', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'acme' }),
          membershipRow({ slug: 'other' }),
        ],
      },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe(
      '/acme/profile'
    )
  })

  it('skips blocked memberships', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'blocked', status: 'blocked' }),
          membershipRow({ slug: 'acme' }),
        ],
      },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe(
      '/acme/profile'
    )
  })

  it('skips orgs with blocked organization status', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'acme', orgStatus: 'blocked' }),
          membershipRow({ slug: 'other' }),
        ],
      },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe(
      '/other/profile'
    )
  })

  it('returns null when no active membership', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBeNull()
  })

  it('returns relative path (not absolute URL)', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    const path = await resolvePrimaryOrganizationPath('user_1')
    expect(path).toBe('/acme/profile')
    expect(path).not.toMatch(/^https?:\/\//)
  })
})

describe('resolveHomePathForUser — onboarding not /no-access', () => {
  it('returns org profile path when user has org', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    await expect(resolveHomePathForUser('user_1')).resolves.toBe(
      '/acme/profile'
    )
  })

  it('returns /onboarding when user has no org — never /no-access', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    const path = await resolveHomePathForUser('user_1')
    expect(path).toBe('/onboarding')
    expect(path).not.toBe('/no-access')
    expect(path).not.toContain('no-access')
  })

  it('is stable: second call returns same', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    const a = await resolveHomePathForUser('user_1')
    const b = await resolveHomePathForUser('user_1')
    expect(a).toBe(b)
  })
})

// ──────────────────────────────────────────────────────────────
// Feature flags
// ──────────────────────────────────────────────────────────────
describe('getEnabledEnterpriseFeatureSlugs / requireEnterpriseFeature', () => {
  it('returns set of slugs', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [{ slug: 'billing' }, { slug: 'members' }] },
      error: null,
    })
    const slugs = await getEnabledEnterpriseFeatureSlugs('org_1')
    expect(slugs.has('billing')).toBe(true)
    expect(slugs.size).toBe(2)
  })

  it('returns empty set when no features', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    await expect(getEnabledEnterpriseFeatureSlugs()).resolves.toEqual(new Set())
  })

  it('captures Sentry message when features.evaluate returns error but still returns', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'outage' },
    })
    // unwrapResult will throw on error envelope — but the implementation captures and then still unwraps.
    // The real code captures via Sentry then calls unwrapResult which throws if error.
    // We assert capture was attempted when error envelope present.
    // In our mock, featuresEvaluate returns error; unwrapResult will throw, so captureMessage should have been called before throw.
    await expect(
      getEnabledEnterpriseFeatureSlugs('org_1')
    ).rejects.toBeDefined()
    expect(mocks.captureMessage).toHaveBeenCalled()
  })

  it('requireEnterpriseFeature passes when slug enabled', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [{ slug: 'billing' }] },
      error: null,
    })
    await expect(
      requireEnterpriseFeature('billing', 'org_1')
    ).resolves.toBeUndefined()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('requireEnterpriseFeature redirects when slug disabled', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [{ slug: 'other' }] },
      error: null,
    })
    await expect(
      requireEnterpriseFeature('billing', 'org_1')
    ).rejects.toMatchObject({ path: '/no-access' })
  })

  it('requireEnterpriseFeature respects custom redirectPath', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    await expect(
      requireEnterpriseFeature('billing', 'org_1', '/custom')
    ).rejects.toMatchObject({ path: '/custom' })
  })

  it('passes through organizationId to evaluate', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    try {
      await requireEnterpriseFeature('billing', 'org_42')
    } catch {}
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org_42' })
    )
  })
})

// ──────────────────────────────────────────────────────────────
// DIFF INVARIANTS — advanced coverage (goldbergyoni best practices)
// AAA, no logic in tests, factories, table-driven, error & concurrency
// ──────────────────────────────────────────────────────────────
describe('requireSession — diff: /access-denied not /register (enterprise gate)', () => {
  it('never redirects to legacy /register for consumer realm', async () => {
    // Arrange
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'consumer', crossRealm: false }))
    )
    // Act & Assert
    await expect(requireSession('/')).rejects.toMatchObject({
      path: '/access-denied',
    })
    expect(mocks.redirect).not.toHaveBeenCalledWith('/register')
    expect(mocks.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining('/register')
    )
  })

  it('redirect target is exactly /access-denied (no query pollution)', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'consumer', crossRealm: false }))
    )
    try {
      await requireSession('/protected')
    } catch {}
    const path = mocks.redirect.mock.calls[0]?.[0] as string
    expect(path).toBe('/access-denied')
  })

  it('does not leak absolute URL when blocking consumer', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'consumer', crossRealm: false }))
    )
    await expect(requireSession('/')).rejects.toMatchObject({
      path: '/access-denied',
    })
    const path = mocks.redirect.mock.calls[0]?.[0] as string
    expect(path).not.toMatch(/^https?:\/\//)
  })

  it('allows enterprise realm regardless of crossRealm flag', async () => {
    for (const crossRealm of [false, true] as const) {
      vi.clearAllMocks()
      mocks.redirect.mockImplementation((path: string) => {
        throw redirectError(path)
      })
      mocks.getAuthSession.mockResolvedValue(
        signedSession(sessionUser({ realm: 'enterprise', crossRealm }))
      )
      await expect(requireSession('/')).resolves.toBeDefined()
    }
  })

  it.each([
    ['/', '/login?returnTo=%2F'],
    ['/acme', '/login?returnTo=%2Facme'],
    ['/acme/profile?x=1', '/login?returnTo=%2Facme%2Fprofile%3Fx%3D1'],
    ['/a b', '/login?returnTo=%2Fa+b'],
  ])(
    'encodes returnTo "%s" as "%s" for unauthenticated',
    async (returnTo, expected) => {
      mocks.getAuthSession.mockResolvedValue({ user: null } as never)
      await expect(requireSession(returnTo)).rejects.toMatchObject({
        path: expected,
      })
    }
  )

  it('propagates NEXT_REDIRECT digest for consumer block', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'consumer', crossRealm: false }))
    )
    try {
      await requireSession('/')
    } catch (e: unknown) {
      expect((e as { digest?: string }).digest).toBe(
        'NEXT_REDIRECT;/access-denied'
      )
    }
  })

  it('propagates thrown error from getAuthSession (does not swallow)', async () => {
    mocks.getAuthSession.mockRejectedValue(new Error('session outage'))
    await expect(requireSession('/')).rejects.toThrow('session outage')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('concurrent calls are isolated — Promise.all', async () => {
    mocks.getAuthSession
      .mockResolvedValueOnce(
        signedSession(sessionUser({ realm: 'enterprise', crossRealm: false }))
      )
      .mockResolvedValueOnce(
        signedSession(sessionUser({ realm: 'consumer', crossRealm: false }))
      )
      .mockResolvedValueOnce(
        signedSession(sessionUser({ realm: 'enterprise', crossRealm: false }))
      )
    const results = await Promise.allSettled([
      requireSession('/a'),
      requireSession('/b'),
      requireSession('/c'),
    ])
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')
    expect(results[2].status).toBe('fulfilled')
  })

  it('returns the session user object verbatim (no stripping)', async () => {
    const user = sessionUser({ realm: 'enterprise', id: 'user_42' })
    mocks.getAuthSession.mockResolvedValue(signedSession(user))
    const out = await requireSession('/x')
    expect(out).toEqual(
      expect.objectContaining({ id: 'user_42', realm: 'enterprise' })
    )
  })

  it('does not call redirect when already signed enterprise', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(sessionUser({ realm: 'enterprise' }))
    )
    await requireSession('/dashboard')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

describe('requireActiveUser — diff: /login?returnTo=%2F not /register', () => {
  it('redirects unknown user to /login?returnTo=%2F exactly (diff invariant)', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    await expect(requireActiveUser('missing')).rejects.toMatchObject({
      path: '/login?returnTo=%2F',
    })
    const path = mocks.redirect.mock.calls[0]?.[0] as string
    expect(path).toBe('/login?returnTo=%2F')
    expect(path).not.toContain('/register')
  })

  it('is relative (not absolute) even though suspended later is absolute', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    try {
      await requireActiveUser('missing')
    } catch (e: unknown) {
      expect((e as { path: string }).path).not.toMatch(/^https?:\/\//)
    }
  })

  it.each([
    ['blocked', false],
    ['suspended', false],
    ['pending', false],
    ['inactive', false],
  ])('status "%s" redirects to suspended', async (status) => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status,
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    await expect(requireActiveUser('user_1')).rejects.toMatchObject({
      path: expect.stringContaining('/suspended'),
    })
    const path = mocks.redirect.mock.calls[0]?.[0] as string
    expect(path).toMatch(/^https?:\/\//)
  })

  it('banned true redirects even when status active', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: true,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    await expect(requireActiveUser('user_1')).rejects.toMatchObject({
      path: expect.stringContaining('/suspended'),
    })
  })

  it('active unbanned returns user with snake→camel mapping', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'Jane',
        last_name: 'Doe',
        avatar: 'https://cdn/img.png',
      },
      error: null,
    })
    const user = await requireActiveUser('user_1')
    expect(user.firstName).toBe('Jane')
    expect(user.lastName).toBe('Doe')
  })

  it('throws on platform error (does not swallow outage)', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'db down' },
    })
    await expect(requireActiveUser('user_1')).rejects.toBeDefined()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('throws when user lookup returns error envelope with code internal for workos fallback', async () => {
    mocks.usersRetrieve.mockResolvedValueOnce({
      data: null,
      error: { code: 'internal', message: 'boom' },
    })
    await expect(requireActiveUser('workos_123')).rejects.toBeDefined()
  })
})

describe('requireOrgMembership — diff: "/" gate and slug-encoded login', () => {
  function activeUser() {
    return {
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    }
  }
  it('missing membership redirects to exactly "/" (never /no-access)', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(requireOrgMembership('user_1', 'acme')).rejects.toMatchObject({
      path: '/',
    })
    const path = mocks.redirect.mock.calls[0]?.[0] as string
    expect(path).toBe('/')
    expect(path).not.toContain('no-access')
  })

  it.each(['acme', 'my-org', 'acme_123', 'a'])(
    'unknown user "%s" encodes returnTo',
    async (slug) => {
      mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
      await expect(requireOrgMembership('unknown', slug)).rejects.toMatchObject(
        { path: `/login?returnTo=%2F${slug}` }
      )
      vi.clearAllMocks()
      mocks.redirect.mockImplementation((path: string) => {
        throw redirectError(path)
      })
      mocks.usersRetrieve.mockResolvedValue({
        data: null,
        error: null,
      } as never)
      mocks.listRouting.mockResolvedValue({
        data: { data: [] },
        error: null,
      } as never)
    }
  )

  it('slug with slash is encoded', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    await expect(
      requireOrgMembership('unknown', 'acme/profile')
    ).rejects.toMatchObject({
      path: expect.stringContaining(encodeURIComponent('/acme/profile')),
    })
  })

  it('propagates platform error from listRouting', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'outage' },
    } as never)
    await expect(requireOrgMembership('user_1', 'acme')).rejects.toBeDefined()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('findActiveOrgMembership returns null (never redirect) when missing', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    const result = await findActiveOrgMembership('user_1', 'acme')
    expect(result).toBeNull()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('findActiveOrgMembership returns null when user absent without membership lookup', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    const result = await findActiveOrgMembership('missing', 'acme')
    expect(result).toBeNull()
    expect(mocks.listRouting).not.toHaveBeenCalled()
  })

  it('concurrent checks isolated', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting
      .mockResolvedValueOnce({
        data: { data: [membershipRow({ slug: 'acme' })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
    const [a, b] = await Promise.allSettled([
      requireOrgMembership('user_1', 'acme'),
      requireOrgMembership('user_1', 'other'),
    ])
    expect(a.status).toBe('fulfilled')
    expect(b.status).toBe('rejected')
    if (b.status === 'rejected')
      expect((b.reason as { path: string }).path).toBe('/')
  })

  it('calls the signed-in membership list with active status (contract)', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    await requireOrgMembership('user_1', 'acme')
    expect(mocks.listRouting).toHaveBeenCalledWith({ status: 'active' })
  })
})

describe('findAuthRoutingUser — mapping & resilience (advanced)', () => {
  it('does not call workos fallback when primary succeeds', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    await findAuthRoutingUser('user_1')
    expect(mocks.usersRetrieve).toHaveBeenCalledTimes(1)
    expect(mocks.usersRetrieve).toHaveBeenCalledWith()
  })

  it.each([
    [null as unknown as string, 'a@b.co'],
    ['user_1', null as unknown as string],
    ['' as unknown as string, 'a@b.co'],
  ])('returns null when id/email falsy (%s,%s)', async (id, email) => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id,
        email,
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    await expect(findAuthRoutingUser('user_1')).resolves.toBeNull()
  })

  it('defaults status to active when null', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: null,
        banned: 0 as unknown as boolean,
        first_name: null,
        last_name: null,
        avatar: null,
      },
      error: null,
    })
    const user = await findAuthRoutingUser('user_1')
    expect(user?.status).toBe('active')
    expect(user?.banned).toBe(false)
  })

  it('throws on primary error envelope', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'boom' },
    })
    await expect(findAuthRoutingUser('user_1')).rejects.toBeDefined()
  })

  it('does not make a second lookup when the signed-in account is absent', async () => {
    mocks.usersRetrieve.mockResolvedValueOnce({ data: null, error: null })
    await expect(findAuthRoutingUser('workos_123')).resolves.toBeNull()
  })

  it('maps snake_case all fields', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'First',
        last_name: 'Last',
        avatar: 'https://img',
      },
      error: null,
    })
    const u = await findAuthRoutingUser('user_1')
    expect(u).toEqual(
      expect.objectContaining({
        firstName: 'First',
        lastName: 'Last',
        avatar: 'https://img',
      })
    )
  })

  it('does not look up another identity when the signed-in account is absent', async () => {
    mocks.usersRetrieve.mockResolvedValueOnce({ data: null, error: null })
    const u = await findAuthRoutingUser('workos_123')
    expect(u).toBeNull()
    expect(mocks.usersRetrieve).toHaveBeenCalledTimes(1)
  })
})

describe('hasOrgPermission — pure & boundary (goldbergyoni: no logic in tests)', () => {
  it.each([
    [[], 'org:read', false],
    [['org:read'], 'org:read', true],
    [['org:read', 'members:read'], 'billing:manage', false],
    [['billing:manage'], 'billing:manage', true],
  ])('permissions %j has "%s" => %s', (perms, perm, expected) => {
    expect(hasOrgPermission({ permissions: perms }, perm)).toBe(expected)
  })
  it('is case-sensitive', () => {
    expect(hasOrgPermission({ permissions: ['Org:Read'] }, 'org:read')).toBe(
      false
    )
  })
  it('does not mutate input', () => {
    const perms = ['org:read']
    hasOrgPermission({ permissions: perms }, 'org:read')
    expect(perms).toEqual(['org:read'])
  })
  it('handles duplicates', () => {
    expect(
      hasOrgPermission({ permissions: ['org:read', 'org:read'] }, 'org:read')
    ).toBe(true)
  })
  it('handles empty permission string', () => {
    expect(hasOrgPermission({ permissions: [''] }, '')).toBe(true)
  })
  it('handles very long permission', () => {
    const long = 'a'.repeat(100)
    expect(hasOrgPermission({ permissions: [long] }, long)).toBe(true)
  })
})

describe('requireOrgPermission — /<slug> gate', () => {
  function activeUser() {
    return {
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: 'A',
        last_name: null,
        avatar: null,
      },
      error: null,
    }
  }
  it('redirects to /<slug> when permission missing', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          { ...membershipRow({ slug: 'acme' }), permissions: ['org:read'] },
        ],
      },
      error: null,
    })
    await expect(
      requireOrgPermission('user_1', 'acme', 'members:read')
    ).rejects.toMatchObject({ path: '/acme' })
    expect(mocks.redirect).toHaveBeenCalledWith('/acme')
  })
  it('propagates missing membership as "/" before permission check', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(
      requireOrgPermission('user_1', 'acme', 'org:read')
    ).rejects.toMatchObject({ path: '/' })
  })
  it('passes when permission present (no redirect)', async () => {
    mocks.usersRetrieve.mockResolvedValue(activeUser() as never)
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    await expect(
      requireOrgPermission('user_1', 'acme', 'org:read')
    ).resolves.toBeDefined()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

describe('resolvePrimaryOrganizationPath — relative & filtering', () => {
  it('prefers first active in order', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'first' }),
          membershipRow({ slug: 'second' }),
        ],
      },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe(
      '/first/profile'
    )
  })
  it('skips blocked membership and blocked org', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'blocked', status: 'blocked' }),
          membershipRow({ slug: 'acme' }),
        ],
      },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe(
      '/acme/profile'
    )
  })
  it('skips org with blocked status', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'acme', orgStatus: 'blocked' }),
          membershipRow({ slug: 'other' }),
        ],
      },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe(
      '/other/profile'
    )
  })
  it('returns null when none active', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'a', status: 'blocked' }),
          membershipRow({ slug: 'b', orgStatus: 'inactive' }),
        ],
      },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBeNull()
  })
  it('returns relative URL with slug verbatim', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'my-org' })] },
      error: null,
    })
    const path = await resolvePrimaryOrganizationPath('user_1')
    expect(path).toBe('/my-org/profile')
    expect(path).not.toMatch(/^https?:\/\//)
  })
  it('throws on platform error', async () => {
    mocks.listRouting.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'outage' },
    } as never)
    await expect(resolvePrimaryOrganizationPath('user_1')).rejects.toBeDefined()
  })
  it('is idempotent', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    const a = await resolvePrimaryOrganizationPath('user_1')
    const b = await resolvePrimaryOrganizationPath('user_1')
    expect(a).toBe(b)
  })
})

describe('resolveHomePathForUser — onboarding fallback never absolute (diff)', () => {
  it('concurrent callers agree on /onboarding', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    const paths = await Promise.all([
      resolveHomePathForUser('user_1'),
      resolveHomePathForUser('user_1'),
      resolveHomePathForUser('user_1'),
    ])
    expect(new Set(paths)).toEqual(new Set(['/onboarding']))
  })
  it('never returns absolute URL', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme' })] },
      error: null,
    })
    const path = await resolveHomePathForUser('user_1')
    expect(path).not.toMatch(/^https?:\/\//)
  })
  it('returns /onboarding when no org and never /no-access', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    const path = await resolveHomePathForUser('user_1')
    expect(path).toBe('/onboarding')
    expect(path).not.toContain('no-access')
  })
})

describe('getEnabledEnterpriseFeatureSlugs — observability & dedup', () => {
  it('deduplicates via Set', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [{ slug: 'billing' }, { slug: 'billing' }] },
      error: null,
    })
    const slugs = await getEnabledEnterpriseFeatureSlugs('org_1')
    expect(slugs.size).toBe(1)
  })
  it('calls evaluate with ENTERPRISE_APP_SLUG and organizationId', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    await getEnabledEnterpriseFeatureSlugs('org_99')
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_99',
        appSlug: expect.any(String),
      })
    )
  })
  it('when org undefined calls with undefined', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    await getEnabledEnterpriseFeatureSlugs()
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: undefined })
    )
  })
  it('Sentry capture level error and category', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'outage' },
    })
    try {
      await getEnabledEnterpriseFeatureSlugs('org_1')
    } catch {}
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ category: 'feature_flags' }),
      })
    )
  })
  it('Sentry extra includes errorCode and call', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: null,
      error: { code: 'rate_limited', message: 'slow' },
    })
    try {
      await getEnabledEnterpriseFeatureSlugs('org_1')
    } catch {}
    const call = mocks.captureMessage.mock.calls[0]?.[1] as {
      extra?: Record<string, unknown>
    }
    expect(call?.extra).toEqual(
      expect.objectContaining({
        errorCode: 'rate_limited',
        call: 'features.evaluate',
      })
    )
  })
  it('throws after capturing (not empty set)', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'outage' },
    })
    await expect(
      getEnabledEnterpriseFeatureSlugs('org_1')
    ).rejects.toBeDefined()
  })
  it('concurrent isolated', async () => {
    mocks.featuresEvaluate
      .mockResolvedValueOnce({ data: { data: [{ slug: 'a' }] }, error: null })
      .mockResolvedValueOnce({ data: { data: [{ slug: 'b' }] }, error: null })
    const [a, b] = await Promise.all([
      getEnabledEnterpriseFeatureSlugs('org_1'),
      getEnabledEnterpriseFeatureSlugs('org_2'),
    ])
    expect(a.has('a')).toBe(true)
    expect(b.has('b')).toBe(true)
  })
  it('returns empty set when no features', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    await expect(getEnabledEnterpriseFeatureSlugs()).resolves.toEqual(new Set())
  })
})

describe('requireEnterpriseFeature — redirect contract', () => {
  it('default redirect is /no-access when disabled', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    await expect(
      requireEnterpriseFeature('billing', 'org_1')
    ).rejects.toMatchObject({ path: '/no-access' })
  })
  it('custom redirect verbatim', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    await expect(
      requireEnterpriseFeature('billing', 'org_1', '/custom-path')
    ).rejects.toMatchObject({ path: '/custom-path' })
  })
  it('case-sensitive', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [{ slug: 'Billing' }] },
      error: null,
    })
    await expect(
      requireEnterpriseFeature('billing', 'org_1')
    ).rejects.toMatchObject({ path: '/no-access' })
  })
  it('passes when enabled', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: [{ slug: 'billing' }] },
      error: null,
    })
    await expect(
      requireEnterpriseFeature('billing', 'org_1')
    ).resolves.toBeUndefined()
  })
})

describe('contract: all redirects carry NEXT_REDIRECT digest', () => {
  it.each([
    [
      'requireSession consumer',
      async () => {
        mocks.getAuthSession.mockResolvedValue(
          signedSession(sessionUser({ realm: 'consumer', crossRealm: false }))
        )
        await requireSession('/')
      },
    ],
    [
      'requireActiveUser unknown',
      async () => {
        mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
        await requireActiveUser('missing')
      },
    ],
    [
      'requireOrgMembership missing',
      async () => {
        mocks.usersRetrieve.mockResolvedValue({
          data: {
            id: 'user_1',
            email: 'a@b.co',
            status: 'active',
            banned: false,
            first_name: 'A',
            last_name: null,
            avatar: null,
          },
          error: null,
        })
        mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
        await requireOrgMembership('user_1', 'acme')
      },
    ],
  ])('%s digest matches NEXT_REDIRECT;<path>', async (_name, fn) => {
    try {
      await fn()
    } catch (e: unknown) {
      const err = e as { digest?: string; path?: string }
      expect(err.digest).toBe(`NEXT_REDIRECT;${err.path}`)
      return
    }
    throw new Error('expected redirect')
  })
})

describe('guards — goldbergyoni anti-flaky & boundary extras', () => {
  it('requireSession with undefined realm blocks (treated as consumer)', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(
        sessionUser({
          realm: undefined as unknown as string,
          crossRealm: false,
        })
      )
    )
    await expect(requireSession('/')).rejects.toMatchObject({
      path: '/access-denied',
    })
  })
  it('requireSession with empty string realm blocks', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession(
        sessionUser({ realm: '' as unknown as string, crossRealm: false })
      )
    )
    await expect(requireSession('/')).rejects.toMatchObject({
      path: '/access-denied',
    })
  })
  it('findAuthRoutingUser handles avatar null vs undefined mapping', async () => {
    mocks.usersRetrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        email: 'a@b.co',
        status: 'active',
        banned: false,
        first_name: null,
        last_name: null,
        avatar: undefined as unknown as string,
      },
      error: null,
    })
    const u = await findAuthRoutingUser('user_1')
    expect(u?.avatar).toBeNull()
  })
  it('resolvePrimaryOrganizationPath skips orgStatus empty string (not active)', async () => {
    mocks.listRouting.mockResolvedValue({
      data: {
        data: [
          membershipRow({ slug: 'acme', orgStatus: '' as unknown as string }),
          membershipRow({ slug: 'other' }),
        ],
      },
      error: null,
    })
    // empty orgStatus != 'active' so skipped, returns other
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe(
      '/other/profile'
    )
  })
  it('getEnabledEnterpriseFeatureSlugs handles null data array? throws', async () => {
    mocks.featuresEvaluate.mockResolvedValue({
      data: { data: null as unknown as { slug: string }[] },
      error: null,
    })
    await expect(
      getEnabledEnterpriseFeatureSlugs('org_1')
    ).rejects.toBeDefined()
  })
})
