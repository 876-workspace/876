import { describe, expect, it } from 'vitest'

import {
  computeWebhookRetryDelaySeconds,
  webhookAttemptExhausted,
  webhookEndpointShouldDisable,
  WEBHOOK_AUTO_DISABLE_FAILURES,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_BASE_DELAY_SECONDS,
  WEBHOOK_RETRY_MAX_DELAY_SECONDS,
} from '../retry.js'

describe('computeWebhookRetryDelaySeconds', () => {
  it('starts at the base delay', () => {
    expect(computeWebhookRetryDelaySeconds(1)).toBe(
      WEBHOOK_RETRY_BASE_DELAY_SECONDS
    )
  })

  it('doubles per attempt', () => {
    expect(computeWebhookRetryDelaySeconds(2)).toBe(
      WEBHOOK_RETRY_BASE_DELAY_SECONDS * 2
    )
    expect(computeWebhookRetryDelaySeconds(3)).toBe(
      WEBHOOK_RETRY_BASE_DELAY_SECONDS * 4
    )
  })

  it('caps at the max delay', () => {
    expect(computeWebhookRetryDelaySeconds(30)).toBe(
      WEBHOOK_RETRY_MAX_DELAY_SECONDS
    )
  })

  it('never exceeds the cap across the full attempt budget', () => {
    for (let attempt = 1; attempt <= WEBHOOK_MAX_ATTEMPTS; attempt += 1)
      expect(computeWebhookRetryDelaySeconds(attempt)).toBeLessThanOrEqual(
        WEBHOOK_RETRY_MAX_DELAY_SECONDS
      )
  })
})

describe('webhookAttemptExhausted', () => {
  it('allows attempts below the max', () => {
    expect(webhookAttemptExhausted(WEBHOOK_MAX_ATTEMPTS - 1)).toBe(false)
  })

  it('exhausts at the max', () => {
    expect(webhookAttemptExhausted(WEBHOOK_MAX_ATTEMPTS)).toBe(true)
  })

  it('caps retries at eight attempts', () => {
    expect(WEBHOOK_MAX_ATTEMPTS).toBe(8)
  })
})

describe('webhookEndpointShouldDisable', () => {
  it('keeps endpoints below the threshold enabled', () => {
    expect(
      webhookEndpointShouldDisable(WEBHOOK_AUTO_DISABLE_FAILURES - 1)
    ).toBe(false)
  })

  it('disables after twenty consecutive failures', () => {
    expect(WEBHOOK_AUTO_DISABLE_FAILURES).toBe(20)
    expect(webhookEndpointShouldDisable(20)).toBe(true)
  })
})
