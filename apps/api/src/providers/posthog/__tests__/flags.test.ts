import { beforeEach, describe, expect, it, vi } from 'vitest'

const snapshot = vi.hoisted(() => ({
  getFlag: vi.fn(),
  getFlagPayload: vi.fn(),
}))
const posthogClient = vi.hoisted(() => ({
  evaluateFlags: vi.fn(),
  shutdown: vi.fn(),
}))
const PostHog = vi.hoisted(() =>
  vi.fn(function PostHogMock() {
    return posthogClient
  })
)
vi.mock('posthog-node', () => ({ PostHog }))

const settings = {
  posthog: {
    projectApiKey: 'phc_project_key',
    host: 'https://us.i.posthog.com',
    personalApiKey: '',
  },
}

describe('getPostHogFlagEvaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    snapshot.getFlag.mockReturnValue(false)
    snapshot.getFlagPayload.mockReturnValue(undefined)
    posthogClient.evaluateFlags.mockResolvedValue(snapshot)
    posthogClient.shutdown.mockResolvedValue(undefined)
  })

  it('makes one scoped evaluateFlags call per evaluation', async () => {
    const { getPostHogFlagEvaluator } = await import('../flags')
    await getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-first', 'platform-second'],
    })
    expect(posthogClient.evaluateFlags).toHaveBeenCalledTimes(1)
    expect(posthogClient.evaluateFlags).toHaveBeenCalledWith('user_1', {
      flagKeys: ['platform-first', 'platform-second'],
    })
  })

  it('passes evaluation context fields to the one scoped request', async () => {
    const { getPostHogFlagEvaluator } = await import('../flags')
    await getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-test'],
      groups: { organization: 'org_1' },
      personProperties: { plan: 'pro' },
      groupProperties: { organization: { plan: 'pro' } },
    })
    expect(posthogClient.evaluateFlags).toHaveBeenCalledTimes(1)
    expect(posthogClient.evaluateFlags).toHaveBeenCalledWith('user_1', {
      flagKeys: ['platform-test'],
      groups: { organization: 'org_1' },
      personProperties: { plan: 'pro' },
      groupProperties: { organization: { plan: 'pro' } },
    })
  })

  it('maps a multivariate value and payload into a complete decision', async () => {
    snapshot.getFlag.mockReturnValue('treatment')
    snapshot.getFlagPayload.mockReturnValue({ color: 'blue' })
    const { getPostHogFlagEvaluator } = await import('../flags')
    const result = await getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-test'],
    })
    expect(result).toEqual(
      new Map([
        [
          'platform-test',
          { enabled: true, variant: 'treatment', payload: { color: 'blue' } },
        ],
      ])
    )
  })

  it('maps true to an enabled decision with a null variant and payload', async () => {
    snapshot.getFlag.mockReturnValue(true)
    const { getPostHogFlagEvaluator } = await import('../flags')
    const result = await getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-test'],
    })
    expect(result).toEqual(
      new Map([
        ['platform-test', { enabled: true, variant: null, payload: null }],
      ])
    )
  })

  it('maps false to a disabled decision with a null variant and payload', async () => {
    snapshot.getFlag.mockReturnValue(false)
    const { getPostHogFlagEvaluator } = await import('../flags')
    const result = await getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-test'],
    })
    expect(result).toEqual(
      new Map([
        ['platform-test', { enabled: false, variant: null, payload: null }],
      ])
    )
  })

  it('does not add a decision for a flag absent from the snapshot', async () => {
    snapshot.getFlag.mockReturnValue(undefined)
    const { getPostHogFlagEvaluator } = await import('../flags')
    const result = await getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-test'],
    })
    expect(result).toEqual(new Map())
    expect(snapshot.getFlagPayload).not.toHaveBeenCalled()
  })

  it('returns an empty map when PostHog rejects', async () => {
    posthogClient.evaluateFlags.mockRejectedValue(new Error('unavailable'))
    const { getPostHogFlagEvaluator } = await import('../flags')
    const result = await getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-test'],
    })
    expect(result).toEqual(new Map())
    expect(posthogClient.evaluateFlags).toHaveBeenCalledTimes(1)
  })

  it('returns an empty map when PostHog exceeds the timeout', async () => {
    posthogClient.evaluateFlags.mockReturnValue(new Promise(() => undefined))
    const { getPostHogFlagEvaluator } = await import('../flags')
    const promise = getPostHogFlagEvaluator(settings as never)!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform-test'],
    })
    await expect(promise).resolves.toEqual(new Map())
    expect(posthogClient.evaluateFlags).toHaveBeenCalledTimes(1)
  })
})
