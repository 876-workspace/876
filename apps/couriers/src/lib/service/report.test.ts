import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: mockCaptureException,
}))

import { reportServiceFailure } from './report'

describe('service.reportServiceFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports the exception with its operation, consequence, and extra context', () => {
    const error = new Error('Database unavailable')

    reportServiceFailure(error, {
      operation: 'branches.create',
      consequence:
        'The branch was not created and the form shows a generic failure.',
      extra: { tenantId: 'ten_rocketship' },
    })

    expect(mockCaptureException).toHaveBeenCalledTimes(1)
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      level: 'error',
      tags: {
        category: 'service',
        service_operation: 'branches.create',
      },
      extra: {
        consequence:
          'The branch was not created and the form shows a generic failure.',
        tenantId: 'ten_rocketship',
      },
    })
  })

  it('does not propagate a Sentry capture failure', () => {
    mockCaptureException.mockImplementation(() => {
      throw new Error('Sentry unavailable')
    })

    expect(() =>
      reportServiceFailure(new Error('Database unavailable'), {
        operation: 'branches.create',
        consequence:
          'The branch was not created and the form shows a generic failure.',
      })
    ).not.toThrow()
    expect(mockCaptureException).toHaveBeenCalledTimes(1)
  })
})
