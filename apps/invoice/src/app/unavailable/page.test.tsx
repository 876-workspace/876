import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetInvoiceContextResult, mockRedirect } = vi.hoisted(() => ({
  mockGetInvoiceContextResult: vi.fn(),
  mockRedirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`)
  }),
}))

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('@/lib/auth/context', () => ({
  getInvoiceContextResult: mockGetInvoiceContextResult,
}))

vi.mock('@/components/platform-unavailable', () => ({
  PlatformUnavailable: () => null,
}))

vi.mock('./_components/recovery-watcher', () => ({
  RecoveryWatcher: () => null,
}))

const UnavailablePage = (await import('./page')).default

/** Runs the page and returns the path it redirected to, or null. */
async function redirectTargetOf(result: unknown): Promise<string | null> {
  mockGetInvoiceContextResult.mockResolvedValue(result)

  try {
    await UnavailablePage()
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.startsWith('REDIRECT:')) throw error
    return message.slice('REDIRECT:'.length)
  }
}

describe('UnavailablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the outage screen while the platform is still unreachable', async () => {
    const target = await redirectTargetOf({ status: 'unavailable' })

    expect(target).toBeNull()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  // The screen has no data of its own, so without this re-check a viewer stayed
  // parked on a stale outage long after 876 came back.
  it('returns a recovered viewer to the app', async () => {
    const target = await redirectTargetOf({
      status: 'ok',
      context: { orgId: 'org_7bQ2' },
    })

    expect(target).toBe('/')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
  })

  it('returns a viewer with no organization to the app for routing', async () => {
    const target = await redirectTargetOf({ status: 'no-organization' })

    expect(target).toBe('/')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
  })

  it('returns a signed-out viewer to the app for routing', async () => {
    const target = await redirectTargetOf({ status: 'signed-out' })

    expect(target).toBe('/')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
  })
})
