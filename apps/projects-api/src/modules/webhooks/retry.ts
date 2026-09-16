export const WEBHOOK_MAX_ATTEMPTS = 8
export const WEBHOOK_RETRY_BASE_DELAY_SECONDS = 60
export const WEBHOOK_RETRY_MAX_DELAY_SECONDS = 3600
export const WEBHOOK_AUTO_DISABLE_FAILURES = 20

export function computeWebhookRetryDelaySeconds(
  attemptAfterIncrement: number
): number {
  const delay =
    WEBHOOK_RETRY_BASE_DELAY_SECONDS * 2 ** Math.max(0, attemptAfterIncrement - 1)
  return Math.min(WEBHOOK_RETRY_MAX_DELAY_SECONDS, delay)
}

export function webhookAttemptExhausted(attempts: number): boolean {
  return attempts >= WEBHOOK_MAX_ATTEMPTS
}

export function webhookEndpointShouldDisable(consecutiveFailures: number): boolean {
  return consecutiveFailures >= WEBHOOK_AUTO_DISABLE_FAILURES
}
