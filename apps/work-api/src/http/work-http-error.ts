import { getError, type WorkErrorCode } from '@876/core'

export class WorkHttpError extends Error {
  readonly workError: ReturnType<typeof getError>

  constructor(code: WorkErrorCode) {
    const workError = getError(code)
    super(workError.message)
    this.name = 'WorkHttpError'
    this.workError = workError
  }
}
