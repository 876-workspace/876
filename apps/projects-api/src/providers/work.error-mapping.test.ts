import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
}))

vi.mock('@876/work/service', () => ({
  create876WorkServiceClient: vi.fn(),
}))
vi.mock('../platform/logger.js', () => ({
  getLogger: () => ({ warn: mocks.warn }),
}))

const {
  projectsEventWorkContext,
  projectsIssueWorkContext,
  projectsMilestoneWorkContext,
  workErrorToProjects,
} = await import('./work.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('projects work contexts', () => {
  it('builds the issue context triple', () => {
    expect(projectsIssueWorkContext('iss_1')).toEqual({
      service: 'projects',
      resource: 'issue',
      id: 'iss_1',
    })
  })

  it('builds the milestone context triple', () => {
    expect(projectsMilestoneWorkContext('ms_1')).toEqual({
      service: 'projects',
      resource: 'milestone',
      id: 'ms_1',
    })
  })

  it('builds the event context triple', () => {
    expect(projectsEventWorkContext('prjev_1')).toEqual({
      service: 'projects',
      resource: 'event',
      id: 'prjev_1',
    })
  })
})

describe('workErrorToProjects', () => {
  it('maps a missing Work workspace to projects/tenant-not-found', () => {
    const error = {
      code: 'work/tenant-not-found',
      message: 'This organization has no Work workspace yet.',
    }

    const result = workErrorToProjects(error)

    expect(result).toEqual({
      code: 'projects/tenant-not-found',
      message: 'This organization does not have a 876 Projects workspace.',
      httpStatus: 404,
    })
    expect(mocks.warn).toHaveBeenCalledTimes(1)
    expect(mocks.warn).toHaveBeenCalledWith(
      {
        work_error_code: error.code,
        work_error_message: error.message,
        projects_error_code: 'projects/tenant-not-found',
      },
      'work_error_mapped'
    )
  })

  it('maps an invalid Work request to projects/invalid-request', () => {
    const error = {
      code: 'work/invalid-request',
      message: 'Invalid Work request.',
    }

    const result = workErrorToProjects(error)

    expect(result).toEqual({
      code: 'projects/invalid-request',
      message: 'The request could not be processed.',
      httpStatus: 400,
    })
  })

  it('maps a missing Work reminder to projects/reminder-not-found', () => {
    const error = {
      code: 'work/reminder-not-found',
      message: 'Reminder not found.',
    }

    const result = workErrorToProjects(error)

    expect(result).toEqual({
      code: 'projects/reminder-not-found',
      message: 'The reminder could not be found.',
      httpStatus: 404,
    })
  })

  it('maps an unrecognized upstream code to projects/internal-error', () => {
    const error = { code: 'work/session-forbidden', message: 'Forbidden.' }

    const result = workErrorToProjects(error)

    expect(result).toEqual({
      code: 'projects/internal-error',
      message: 'Something went wrong. Please try again.',
      httpStatus: 500,
    })
  })

  it('maps a null upstream error to projects/internal-error', () => {
    const result = workErrorToProjects(null)

    expect(result).toEqual({
      code: 'projects/internal-error',
      message: 'Something went wrong. Please try again.',
      httpStatus: 500,
    })
  })

  it('maps an undefined upstream error to projects/internal-error', () => {
    const result = workErrorToProjects(undefined)

    expect(result).toEqual({
      code: 'projects/internal-error',
      message: 'Something went wrong. Please try again.',
      httpStatus: 500,
    })
  })
})
