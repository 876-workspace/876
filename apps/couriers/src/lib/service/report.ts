import * as Sentry from '@sentry/nextjs'

export function reportServiceFailure(
  error: unknown,
  context: {
    operation: string
    consequence: string
    extra?: Record<string, unknown>
  }
): void {
  try {
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        category: 'service',
        service_operation: context.operation,
      },
      extra: {
        consequence: context.consequence,
        ...context.extra,
      },
    })
  } catch {
    // A broken telemetry client must not replace the service response with an
    // exception, or users lose the actionable error the service already built.
  }
}
