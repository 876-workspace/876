import { beforeEach, describe, expect, it, vi } from 'vitest'

const posthogClient = vi.hoisted(() => ({
  getFeatureFlag: vi.fn(),
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
    posthogClient.getFeatureFlag.mockResolvedValue(false)
    posthogClient.shutdown.mockResolvedValue(undefined)
  })

  it('coerces a string variant to an enabled decision', async () => {
    posthogClient.getFeatureFlag.mockResolvedValue('treatment')
    const { getPostHogFlagEvaluator } = await import('../flags')
    const evaluator = getPostHogFlagEvaluator(settings as never)

    const result = await evaluator!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform_test_flag'],
    })

    expect(result).toEqual(new Map([['platform_test_flag', true]]))
  })

  it('omits an undefined provider response instead of recording false', async () => {
    posthogClient.getFeatureFlag.mockResolvedValue(undefined)
    const { getPostHogFlagEvaluator } = await import('../flags')
    const evaluator = getPostHogFlagEvaluator(settings as never)

    const result = await evaluator!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform_test_flag'],
    })

    expect(result).toEqual(new Map())
  })

  it('sends the feature flag exposure event with exact options', async () => {
    const { getPostHogFlagEvaluator } = await import('../flags')
    const evaluator = getPostHogFlagEvaluator(settings as never)

    await evaluator!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform_test_flag'],
    })

    expect(posthogClient.getFeatureFlag).toHaveBeenCalledOnce()
    expect(posthogClient.getFeatureFlag).toHaveBeenCalledWith(
      'platform_test_flag',
      'user_1',
      { sendFeatureFlagEvents: true }
    )
  })

  it('passes organization groups to PostHog', async () => {
    const { getPostHogFlagEvaluator } = await import('../flags')
    const evaluator = getPostHogFlagEvaluator(settings as never)

    await evaluator!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform_test_flag'],
      groups: { organization: 'org_1' },
    })

    expect(posthogClient.getFeatureFlag).toHaveBeenCalledWith(
      'platform_test_flag',
      'user_1',
      { groups: { organization: 'org_1' }, sendFeatureFlagEvents: true }
    )
  })

  it('returns an empty map when the PostHog client rejects', async () => {
    posthogClient.getFeatureFlag.mockRejectedValue(new Error('unavailable'))
    const { getPostHogFlagEvaluator } = await import('../flags')
    const evaluator = getPostHogFlagEvaluator(settings as never)

    const result = await evaluator!.evaluate({
      distinctId: 'user_1',
      slugs: ['platform_test_flag'],
    })

    expect(result).toEqual(new Map())
  })
})
