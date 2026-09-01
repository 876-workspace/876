import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetAuthSession,
  mockGetInvoiceContextResult,
  mockRedirect,
  mockRequireValidSession,
} = vi.hoisted(() => ({
  mockGetAuthSession: vi.fn(),
  mockGetInvoiceContextResult: vi.fn(),
  mockRedirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`)
  }),
  mockRequireValidSession: vi.fn(async () => {}),
}))

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('@/lib/auth/context', () => ({
  getInvoiceContextResult: mockGetInvoiceContextResult,
}))

vi.mock('@/lib/auth/guards', () => ({
  requireValidSession: mockRequireValidSession,
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mockGetAuthSession,
  isSignedSession: (session: { user: unknown }) => session.user !== null,
}))

vi.mock('@/components/shell/shell', () => ({
  InvoiceShell: ({ children }: { children: React.ReactNode }) => children,
}))

const AppLayout = (await import('./layout')).default

function contextWith(accessStatus: string, role = 'super-admin') {
  return {
    status: 'ok' as const,
    context: {
      userId: 'user_2kL9mN4q',
      orgId: 'org_7bQ2',
      orgName: 'Acme Trading Ltd',
      orgSlug: 'acme-trading',
      role,
      organizations: [
        {
          id: 'org_7bQ2',
          name: 'Acme Trading Ltd',
          slug: 'acme-trading',
          role,
        },
      ],
      accessStatus,
    },
  }
}

/** Runs the layout and returns the path it redirected to, or null. */
async function redirectTargetOf(result: unknown): Promise<string | null> {
  mockGetInvoiceContextResult.mockResolvedValue(result)

  try {
    await AppLayout({ children: null })
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!message.startsWith('REDIRECT:')) throw error
    return message.slice('REDIRECT:'.length)
  }
}

describe('AppLayout entitlement routing', () => {
  beforeEach(() => {
    mockGetAuthSession.mockResolvedValue({
      user: {
        id: 'user_2kL9mN4q',
        email: 'alejandra@example.com',
        accountType: 'enterprise',
        orgId: 'org_7bQ2',
        firstName: 'Alejandra',
        lastName: 'Reyes',
        avatar: null,
      },
    })
  })

  describe('organization without an Invoice subscription', () => {
    // Regression: the layout answered /no-access here, which dead-ended every
    // organization created before 876 Invoice existed — including ones already
    // provisioned with a Billing finance plane. /onboarding owns the decision
    // and can activate the subscription for an owner or admin.
    it('routes an owner to onboarding rather than no-access', async () => {
      const target = await redirectTargetOf(contextWith('none', 'super-admin'))

      expect(target).toBe('/onboarding')
      expect(mockRedirect).toHaveBeenCalledTimes(1)
    })

    it('routes a non-admin member to onboarding, which owns the no-access decision', async () => {
      const target = await redirectTargetOf(contextWith('none', 'member'))

      expect(target).toBe('/onboarding')
      expect(mockRedirect).toHaveBeenCalledTimes(1)
    })

    it('routes a blocked organization to onboarding, which owns the no-access decision', async () => {
      const target = await redirectTargetOf(contextWith('blocked', 'super-admin'))

      expect(target).toBe('/onboarding')
      expect(mockRedirect).toHaveBeenCalledTimes(1)
    })
  })

  describe('organization with an entitlement', () => {
    it('renders without redirecting when the subscription is active', async () => {
      const target = await redirectTargetOf(contextWith('active'))

      expect(target).toBeNull()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('renders without redirecting when the subscription is trialing', async () => {
      const target = await redirectTargetOf(contextWith('trialing'))

      expect(target).toBeNull()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('unresolvable context', () => {
    it('routes an account with no organization to onboarding', async () => {
      const target = await redirectTargetOf({ status: 'no-organization' })

      expect(target).toBe('/onboarding')
      expect(mockRedirect).toHaveBeenCalledTimes(1)
    })

    it('routes an unavailable platform lookup to unavailable page', async () => {
      const target = await redirectTargetOf({ status: 'unavailable' })

      expect(target).toBe('/unavailable')
      expect(mockRedirect).toHaveBeenCalledTimes(1)
    })

    // "Not signed in" is not an onboarding step. This previously fell into the
    // catch-all below and sent a viewer whose session had stopped being valid
    // into the create-an-organization flow, with no route back to login.
    it('routes a signed-out viewer to login, not onboarding', async () => {
      const target = await redirectTargetOf({ status: 'signed-out' })

      expect(target).toBe('/login?returnTo=%2F')
      expect(mockRedirect).toHaveBeenCalledTimes(1)
    })
  })
})
