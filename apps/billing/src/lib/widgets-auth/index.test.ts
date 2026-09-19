import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthSession, isSignedSession, getFeatures } = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getFeatures: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ getAuthSession, isSignedSession }))
vi.mock('@/lib/features', () => ({ getFeatures }))

const { requireNotepadMember } = await import('./index')

function signedSession(
  overrides: { id?: string; orgId?: string | null } = {}
) {
  return {
    user: {
      id: overrides.id ?? 'user_2kL9mN4q',
      orgId: overrides.orgId === undefined ? 'org_7xQ2' : overrides.orgId,
    },
  }
}

function featuresWith(enabledWidgetIds: string[]) {
  return { widgets: { enabledWidgetIds } }
}

describe('requireNotepadMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSignedSession.mockReturnValue(true)
    getAuthSession.mockResolvedValue(signedSession())
    getFeatures.mockResolvedValue(featuresWith(['notepad']))
  })

  describe('happy path', () => {
    it('returns the user id and no response when notepad is enabled', async () => {
      const result = await requireNotepadMember()

      expect(result).toEqual({ userId: 'user_2kL9mN4q', response: null })
    })

    it('resolves features for the signed-in user and their organization', async () => {
      await requireNotepadMember()

      expect(getFeatures).toHaveBeenCalledTimes(1)
      expect(getFeatures).toHaveBeenCalledWith({
        userId: 'user_2kL9mN4q',
        organizationId: 'org_7xQ2',
      })
    })

    it('passes undefined rather than null when the session carries no organization', async () => {
      getAuthSession.mockResolvedValue(signedSession({ orgId: null }))

      await requireNotepadMember()

      expect(getFeatures).toHaveBeenCalledWith({
        userId: 'user_2kL9mN4q',
        organizationId: undefined,
      })
    })
  })

  describe('unauthenticated', () => {
    it('answers 401 when the session is not signed', async () => {
      isSignedSession.mockReturnValue(false)

      const result = await requireNotepadMember()

      expect(result.userId).toBeNull()
      expect(result.response?.status).toBe(401)
      await expect(result.response?.json()).resolves.toEqual({
        error: 'Unauthorized.',
      })
    })

    it('does not resolve features when the session is not signed', async () => {
      isSignedSession.mockReturnValue(false)

      await requireNotepadMember()

      expect(getFeatures).not.toHaveBeenCalled()
    })
  })

  // Regression: Billing checked only for a signed session and commented that
  // the shell enforced the feature gate. access-control.md — hiding a link
  // never replaces a guard, so a signed-in member could reach these routes
  // with the notepad widget disabled.
  describe('feature gate', () => {
    it('answers 403 when notepad is not among the enabled widgets', async () => {
      getFeatures.mockResolvedValue(featuresWith(['chat']))

      const result = await requireNotepadMember()

      expect(result.userId).toBeNull()
      expect(result.response?.status).toBe(403)
      await expect(result.response?.json()).resolves.toEqual({
        error: 'Access to the notepad widget is disabled.',
      })
    })

    it('answers 403 when no widgets are enabled at all', async () => {
      getFeatures.mockResolvedValue(featuresWith([]))

      const result = await requireNotepadMember()

      expect(result.userId).toBeNull()
      expect(result.response?.status).toBe(403)
    })

    // getFeatures returns an empty widget list when evaluation fails, so an
    // outage must deny rather than grant.
    it('denies when feature evaluation degraded to an empty widget list', async () => {
      getFeatures.mockResolvedValue(featuresWith([]))

      const result = await requireNotepadMember()

      expect(result.response?.status).toBe(403)
    })

    it('does not grant access on a widget id that merely contains notepad', async () => {
      getFeatures.mockResolvedValue(featuresWith(['notepad-beta']))

      const result = await requireNotepadMember()

      expect(result.userId).toBeNull()
      expect(result.response?.status).toBe(403)
    })
  })
})
