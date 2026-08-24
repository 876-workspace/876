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
  return { ...actual, getAuthSession: mocks.getAuthSession, isSignedSession: (actual.isSignedSession as unknown) }
})
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: vi.fn(async () => ({
    memberships: { listRouting: mocks.listRouting },
    users: { retrieve: mocks.usersRetrieve },
    features: { evaluate: mocks.featuresEvaluate },
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
  const err = Object.assign(new Error(`NEXT_REDIRECT:${path}`), { path, digest: `NEXT_REDIRECT;${path}` })
  return err as never
}

function sessionUser(overrides: Partial<{ id: string; realm: string; crossRealm: boolean }> = {}) {
  return { id: 'user_1', email: 'a@b.co', realm: 'enterprise', crossRealm: false, firstName: 'A', lastName: 'B', emailVerified: true, avatar: null, username: 'a', ...overrides }
}

function signedSession(user = sessionUser()) {
  return { user, accessToken: 'tok' }
}

function membershipRow(overrides: Partial<{ slug: string; status: string; orgStatus: string }> = {}) {
  const slug = overrides.slug ?? 'acme'
  return {
    id: 'mem_1',
    role: 'owner',
    status: overrides.status ?? 'active',
    permissions: ['org:read', 'members:read'],
    organization: { id: 'org_1', name: 'Acme', slug, status: overrides.orgStatus ?? 'active' },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.redirect.mockImplementation((path: string) => { throw redirectError(path) })
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
    mocks.getAuthSession.mockResolvedValue(signedSession(sessionUser({ realm: 'enterprise' })))
    const user = await requireSession('/dashboard')
    expect(user.id).toBe('user_1')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects consumer realm to /access-denied', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession(sessionUser({ realm: 'consumer', crossRealm: false })))
    await expect(requireSession('/')).rejects.toMatchObject({ path: '/access-denied' })
  })

  it('allows cross-realm consumer to pass', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession(sessionUser({ realm: 'consumer', crossRealm: true })))
    const user = await requireSession('/')
    expect(user.id).toBe('user_1')
  })

  it('redirects unauthenticated to /login with returnTo', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: null } as never)
    await expect(requireSession('/protected')).rejects.toMatchObject({ path: expect.stringContaining('/login') })
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

  it.each([['enterprise' as const, false, false], ['consumer' as const, false, true], ['consumer' as const, true, false]])(
    'realm=%s crossRealm=%s → redirects=%s',
    async (realm, crossRealm, shouldRedirect) => {
      mocks.getAuthSession.mockResolvedValue(signedSession(sessionUser({ realm, crossRealm })))
      if (shouldRedirect) await expect(requireSession('/')).rejects.toMatchObject({ path: '/access-denied' })
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
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: 'B', avatar: null }, error: null })
    const user = await findAuthRoutingUser('user_1')
    expect(user?.id).toBe('user_1')
    expect(mocks.usersRetrieve).toHaveBeenCalledTimes(1)
  })

  it('falls back to workosId lookup when primary returns null', async () => {
    mocks.usersRetrieve
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    const user = await findAuthRoutingUser('workos_123')
    expect(user?.id).toBe('user_1')
    expect(mocks.usersRetrieve).toHaveBeenCalledTimes(2)
    expect(mocks.usersRetrieve).toHaveBeenNthCalledWith(2, { workosId: 'workos_123' })
  })

  it('returns null when row missing required id or email', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: null, email: null }, error: null })
    await expect(findAuthRoutingUser('user_1')).resolves.toBeNull()
  })

  it('maps snake_case fields to camelCase', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'First', last_name: 'Last', avatar: 'https://img' }, error: null })
    const user = await findAuthRoutingUser('user_1')
    expect(user?.firstName).toBe('First')
    expect(user?.avatar).toBe('https://img')
  })

  it('throws when platform returns error envelope (does not swallow server error)', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: { code: 'internal', message: 'boom' } })
    await expect(findAuthRoutingUser('user_1')).rejects.toBeDefined()
  })
})

// ──────────────────────────────────────────────────────────────
// requireActiveUser — banned / inactive guards
// ──────────────────────────────────────────────────────────────
describe('requireActiveUser', () => {
  it('returns active unbanned user', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    const user = await requireActiveUser('user_1')
    expect(user.id).toBe('user_1')
  })

  it('redirects when user not found', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    await expect(requireActiveUser('missing')).rejects.toMatchObject({ path: expect.stringContaining('/app') })
  })

  it('redirects banned user to /suspended', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: true, first_name: 'A', last_name: null, avatar: null }, error: null })
    await expect(requireActiveUser('user_1')).rejects.toMatchObject({ path: expect.stringContaining('/suspended') })
  })

  it('redirects inactive user to /suspended', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'blocked', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    await expect(requireActiveUser('user_1')).rejects.toMatchObject({ path: expect.stringContaining('/suspended') })
  })
})

// ──────────────────────────────────────────────────────────────
// requireOrgMembership — the diff's core routing change: redirects to '/' never /no-access
// ──────────────────────────────────────────────────────────────
describe('requireOrgMembership', () => {
  it('returns user + membership when active membership exists', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    mocks.listRouting.mockResolvedValue({ data: { data: [membershipRow({ slug: 'acme' })] }, error: null })
    const result = await requireOrgMembership('user_1', 'acme')
    expect(result.membership.organization.slug).toBe('acme')
    expect(result.user.id).toBe('user_1')
  })

  it('redirects to "/" (not /no-access) when membership missing — the diff invariant', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(requireOrgMembership('user_1', 'acme')).rejects.toMatchObject({ path: '/' })
    expect(mocks.redirect).toHaveBeenCalledWith('/')
    expect(mocks.redirect).not.toHaveBeenCalledWith(expect.stringContaining('no-access'))
  })

  it('redirects to consumer app when user not found', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: null, error: null })
    await expect(requireOrgMembership('unknown', 'acme')).rejects.toMatchObject({ path: expect.stringContaining('/app') })
  })

  it('scopes lookup to slug + status active', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    mocks.listRouting.mockResolvedValue({ data: { data: [membershipRow({ slug: 'acme' })] }, error: null })
    await requireOrgMembership('user_1', 'acme')
    expect(mocks.listRouting).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user_1', orgSlug: 'acme', status: 'active' }))
  })

  it('findActiveOrgMembership returns null (not redirect) when missing — route-handler contract', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(findActiveOrgMembership('user_1', 'acme')).resolves.toBeNull()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('findActiveOrgMembership returns membership when present', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    mocks.listRouting.mockResolvedValue({ data: { data: [membershipRow({ slug: 'acme' })] }, error: null })
    const m = await findActiveOrgMembership('user_1', 'acme')
    expect(m?.organization.slug).toBe('acme')
  })
})

// ──────────────────────────────────────────────────────────────
// hasOrgPermission & requireOrgPermission
// ──────────────────────────────────────────────────────────────
describe('hasOrgPermission / requireOrgPermission', () => {
  it('hasOrgPermission returns true when permission present', () => {
    expect(hasOrgPermission({ permissions: ['org:read', 'members:read'] }, 'members:read')).toBe(true)
  })
  it('hasOrgPermission returns false when missing', () => {
    expect(hasOrgPermission({ permissions: ['org:read'] }, 'billing:manage')).toBe(false)
  })
  it('requireOrgPermission passes when permission present', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    mocks.listRouting.mockResolvedValue({ data: { data: [membershipRow({ slug: 'acme' })] }, error: null })
    const result = await requireOrgPermission('user_1', 'acme', 'org:read')
    expect(result.membership.permissions).toContain('org:read')
  })
  it('requireOrgPermission redirects to /<slug> when permission missing', async () => {
    mocks.usersRetrieve.mockResolvedValue({ data: { id: 'user_1', email: 'a@b.co', status: 'active', banned: false, first_name: 'A', last_name: null, avatar: null }, error: null })
    mocks.listRouting.mockResolvedValue({ data: { data: [{ ...membershipRow({ slug: 'acme' }), permissions: ['org:read'] }] }, error: null })
    await expect(requireOrgPermission('user_1', 'acme', 'billing:manage')).rejects.toMatchObject({ path: '/acme' })
  })
})

// ──────────────────────────────────────────────────────────────
// resolvePrimaryOrganizationPath & resolveHomePathForUser
// ──────────────────────────────────────────────────────────────
describe('resolvePrimaryOrganizationPath', () => {
  it('returns /<slug>/profile for first active org', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [membershipRow({ slug: 'acme' }), membershipRow({ slug: 'other' })] }, error: null })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe('/acme/profile')
  })

  it('skips blocked memberships', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'blocked', status: 'blocked' }), membershipRow({ slug: 'acme' })] },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe('/acme/profile')
  })

  it('skips orgs with blocked organization status', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [membershipRow({ slug: 'acme', orgStatus: 'blocked' }), membershipRow({ slug: 'other' })] },
      error: null,
    })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBe('/other/profile')
  })

  it('returns null when no active membership', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(resolvePrimaryOrganizationPath('user_1')).resolves.toBeNull()
  })

  it('returns relative path (not absolute URL)', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [membershipRow({ slug: 'acme' })] }, error: null })
    const path = await resolvePrimaryOrganizationPath('user_1')
    expect(path).toBe('/acme/profile')
    expect(path).not.toMatch(/^https?:\/\//)
  })
})

describe('resolveHomePathForUser — the diff: /register not /no-access', () => {
  it('returns org profile path when user has org', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [membershipRow({ slug: 'acme' })] }, error: null })
    await expect(resolveHomePathForUser('user_1')).resolves.toBe('/acme/profile')
  })

  it('returns /register when user has no org — never /no-access (diff invariant)', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    const path = await resolveHomePathForUser('user_1')
    expect(path).toBe('/register')
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
    mocks.featuresEvaluate.mockResolvedValue({ data: { data: [{ slug: 'billing' }, { slug: 'members' }] }, error: null })
    const slugs = await getEnabledEnterpriseFeatureSlugs('org_1')
    expect(slugs.has('billing')).toBe(true)
    expect(slugs.size).toBe(2)
  })

  it('returns empty set when no features', async () => {
    mocks.featuresEvaluate.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(getEnabledEnterpriseFeatureSlugs()).resolves.toEqual(new Set())
  })

  it('captures Sentry message when features.evaluate returns error but still returns', async () => {
    mocks.featuresEvaluate.mockResolvedValue({ data: null, error: { code: 'internal', message: 'outage' } })
    // unwrapResult will throw on error envelope — but the implementation captures and then still unwraps.
    // The real code captures via Sentry then calls unwrapResult which throws if error.
    // We assert capture was attempted when error envelope present.
    // In our mock, featuresEvaluate returns error; unwrapResult will throw, so captureMessage should have been called before throw.
    await expect(getEnabledEnterpriseFeatureSlugs('org_1')).rejects.toBeDefined()
    expect(mocks.captureMessage).toHaveBeenCalled()
  })

  it('requireEnterpriseFeature passes when slug enabled', async () => {
    mocks.featuresEvaluate.mockResolvedValue({ data: { data: [{ slug: 'billing' }] }, error: null })
    await expect(requireEnterpriseFeature('billing', 'org_1')).resolves.toBeUndefined()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('requireEnterpriseFeature redirects when slug disabled', async () => {
    mocks.featuresEvaluate.mockResolvedValue({ data: { data: [{ slug: 'other' }] }, error: null })
    await expect(requireEnterpriseFeature('billing', 'org_1')).rejects.toMatchObject({ path: '/no-access' })
  })

  it('requireEnterpriseFeature respects custom redirectPath', async () => {
    mocks.featuresEvaluate.mockResolvedValue({ data: { data: [] }, error: null })
    await expect(requireEnterpriseFeature('billing', 'org_1', '/custom')).rejects.toMatchObject({ path: '/custom' })
  })

  it('passes through organizationId to evaluate', async () => {
    mocks.featuresEvaluate.mockResolvedValue({ data: { data: [] }, error: null })
    try {
      await requireEnterpriseFeature('billing', 'org_42')
    } catch {}
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org_42' }))
  })
})
