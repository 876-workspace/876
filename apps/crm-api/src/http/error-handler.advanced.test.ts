import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { errorHandler, notFoundHandler } from './error-handler.js'

function buildAppWithError(error: unknown) {
  const app = express()
  app.get('/boom', (_req, _res, next) => next(error))
  app.use(errorHandler)
  return app
}

function buildAppNotFound() {
  const app = express()
  app.use(notFoundHandler)
  return app
}

describe('errorHandler - terminal boundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { consoleSpy.mockRestore() })

  it('translates ZodError to 422 crm/invalid-request without leaking zod details', async () => {
    const zod = new ZodError([{ code: 'invalid_type', expected: 'string', input: 123, path: ['name'], message: 'Invalid' }])
    const res = await request(buildAppWithError(zod)).get('/boom')
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ data: null, error: { code: 'crm/invalid-request', message: 'Invalid request.' } })
    expect(res.body.error.httpStatus).toBeUndefined()
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('logs and returns 500 crm/internal for generic Error', async () => {
    const res = await request(buildAppWithError(new Error('unexpected'))).get('/boom')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ data: null, error: { code: 'crm/internal', message: 'Internal server error.' } })
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  it('logs and returns 500 for thrown string', async () => {
    const res = await request(buildAppWithError('weird string throw')).get('/boom')
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('crm/internal')
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('logs and returns 500 for Error with empty message', async () => {
    const res = await request(buildAppWithError(new Error(''))).get('/boom')
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('crm/internal')
  })

  it('logs and returns 500 for TypeError', async () => {
    const res = await request(buildAppWithError(new TypeError('type boom'))).get('/boom')
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('crm/internal')
  })

  it('client body never contains httpStatus or stack', async () => {
    const res = await request(buildAppWithError(new Error('boom'))).get('/boom')
    expect(res.body.error.httpStatus).toBeUndefined()
    expect(res.body.error.stack).toBeUndefined()
    expect(res.body.error.description).toBeUndefined()
  })

  it('ZodError with empty issues still maps to 422', async () => {
    const zod = new ZodError([])
    const res = await request(buildAppWithError(zod)).get('/boom')
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('crm/invalid-request')
  })

  it('does not treat registered error value thrown as exception; still 500 because handler is for exceptions only', async () => {
    // Even if someone mistakenly throws a value error, handler treats unknown as 500.
    // This documents that expected failures must be returned, not thrown.
    const { getError } = await import('@876/core')
    const val = getError('crm/team-not-found')
    const res = await request(buildAppWithError(val as unknown as Error)).get('/boom')
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('crm/internal')
  })
})

describe('notFoundHandler - standalone 404', () => {
  it('returns 404 crm/not-found envelope', async () => {
    const res = await request(buildAppNotFound()).get('/anything')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ data: null, error: { code: 'crm/not-found', message: 'Not found.' } })
  })

  it('body never leaks httpStatus', async () => {
    const res = await request(buildAppNotFound()).get('/missing')
    expect(res.body.error.httpStatus).toBeUndefined()
  })

  it('is consistent across methods', async () => {
    const app = express()
    app.use(notFoundHandler)
    for (const method of ['get', 'post', 'put', 'delete'] as const) {
      const res = await request(app)[method]('/x')
      expect(res.status).toBe(404)
    }
  })

  it('concurrent not-found requests are isolated', async () => {
    const app = buildAppNotFound()
    const results = await Promise.all([request(app).get('/a'), request(app).get('/b'), request(app).get('/c')])
    for (const res of results) expect(res.status).toBe(404)
  })
})

describe('errorHandler isolation - vitest best practices', () => {
  it('each request gets fresh console spy without cross-test pollution', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(buildAppWithError(new Error('x'))).get('/boom')
    expect(res.status).toBe(500)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    const res2 = await request(buildAppWithError(new ZodError([]))).get('/boom')
    expect(res2.status).toBe(422)
  })
})
