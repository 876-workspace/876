import type { AppError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
}))

vi.mock('@876/work/integration', () => ({
  create876WorkIntegrationClient: vi.fn(),
}))
vi.mock('../platform/logger.js', () => ({
  getLogger: () => ({ warn: mocks.warn }),
}))

const { workErrorToCrm } = await import('./work.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workErrorToCrm', () => {
  it('maps a missing connection scope to crm/work-not-connected', () => {
    const error = {
      code: 'work/connection-forbidden',
      message: 'The app Work connection lacks the required scope.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-not-connected',
      message:
        'Connect the CRM app to this organization’s Work workspace with the required scopes to continue.',
      httpStatus: 403,
    })
    expect(mocks.warn).toHaveBeenCalledTimes(1)
    expect(mocks.warn).toHaveBeenCalledWith(
      {
        work_error_code: error.code,
        work_error_message: error.message,
        crm_error_code: 'crm/work-not-connected',
      },
      'work_error_mapped'
    )
  })

  it('maps an invalid Work API key to crm/work-not-connected', () => {
    const error = {
      code: 'work/invalid-api-key',
      message: 'The 876 app API key is invalid.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-not-connected',
      message:
        'Connect the CRM app to this organization’s Work workspace with the required scopes to continue.',
      httpStatus: 403,
    })
  })

  it('maps an unconfigured Work client to crm/work-not-connected', () => {
    const error = {
      code: 'work/not-configured',
      message: 'Work client is not configured.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-not-connected',
      message:
        'Connect the CRM app to this organization’s Work workspace with the required scopes to continue.',
      httpStatus: 403,
    })
  })

  it('maps an unauthorized Work request to crm/work-not-connected', () => {
    const error = { code: 'work/unauthorized', message: 'Unauthorized.' }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-not-connected',
      message:
        'Connect the CRM app to this organization’s Work workspace with the required scopes to continue.',
      httpStatus: 403,
    })
  })

  it('maps a missing Work workspace to crm/work-workspace-missing', () => {
    const error = {
      code: 'work/tenant-not-found',
      message: 'This organization has no Work workspace yet.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-workspace-missing',
      message: 'Provision this organization’s Work workspace to continue.',
      httpStatus: 404,
    })
  })

  it('maps an inactive Work workspace to crm/work-workspace-inactive', () => {
    const error = {
      code: 'work/tenant-inactive',
      message: 'This organization’s Work workspace is not active.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-workspace-inactive',
      message: 'Activate this organization’s Work workspace to continue.',
      httpStatus: 409,
    })
  })

  it('maps an acting-user denial to crm/work-forbidden', () => {
    const error = {
      code: 'work/session-forbidden',
      message: 'You do not have permission to perform this Work action.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-forbidden',
      message:
        'The acting user is not permitted to perform this Work operation; grant the required permission to continue.',
      httpStatus: 403,
    })
  })

  it('maps an invalid Work request to crm/invalid-request', () => {
    const error = {
      code: 'work/invalid-request',
      message: 'Invalid Work request.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/invalid-request',
      message: 'Invalid request.',
      httpStatus: 422,
    })
  })

  it('maps an invalid Work response to crm/work-invalid-response', () => {
    const error = {
      code: 'work/invalid-response',
      message: 'Work API returned an invalid response.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-invalid-response',
      message:
        'The shared Work service returned an invalid response; retry, then contact support if it persists.',
      httpStatus: 502,
    })
  })

  it('maps an unavailable Work identity service to crm/work-unavailable', () => {
    const error = {
      code: 'work/identity-unavailable',
      message: 'The identity service could not verify access. Please retry.',
    }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
  })

  it('maps an internal Work failure to crm/work-unavailable', () => {
    const error = { code: 'work/internal', message: 'Internal server error.' }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
  })

  it('maps an unrecognized upstream code to crm/work-unavailable', () => {
    const error = { code: 'network/offline', message: 'Fetch failed.' }

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
  })

  it('maps a transport failure without a code to crm/work-unavailable', () => {
    const error = { message: 'Fetch failed.' } as unknown as AppError

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
  })

  it('maps a null upstream error to crm/work-unavailable', () => {
    const result = workErrorToCrm(null)

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
  })

  it('maps an undefined upstream error to crm/work-unavailable', () => {
    const result = workErrorToCrm(undefined)

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
  })

  it('maps an error with no message to its CRM category', () => {
    const error = { code: 'work/connection-forbidden' } as unknown as AppError

    const result = workErrorToCrm(error)

    expect(result).toEqual({
      code: 'crm/work-not-connected',
      message:
        'Connect the CRM app to this organization’s Work workspace with the required scopes to continue.',
      httpStatus: 403,
    })
  })
})
