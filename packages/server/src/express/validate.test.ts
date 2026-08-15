import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { validate, validBody, validParams, validQuery } from './validate'

function fakeReq(overrides: Partial<Request> = {}): Request {
  return { valid: undefined, ...overrides } as unknown as Request
}

describe('validate', () => {
  it('parses body, query, and params onto req.valid and calls next once with no error', () => {
    const req = fakeReq({
      body: { name: 'Alejandra' },
      query: { limit: '25' },
      params: { id: 'cust_1' },
    })
    const next = vi.fn() as unknown as NextFunction

    validate({
      body: z.strictObject({ name: z.string() }),
      query: z.object({ limit: z.coerce.number().int() }),
      params: z.object({ id: z.string() }),
    })(req, {} as Response, next)

    expect(req.valid).toEqual({
      params: { id: 'cust_1' },
      body: { name: 'Alejandra' },
      query: { limit: 25 },
    })
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  it('throws a ZodError and does not call next when the body is invalid', () => {
    const req = fakeReq({ body: { name: 123 } })
    const next = vi.fn() as unknown as NextFunction

    expect(() =>
      validate({ body: z.strictObject({ name: z.string() }) })(
        req,
        {} as Response,
        next
      )
    ).toThrow(z.ZodError)
    expect(next).not.toHaveBeenCalled()
  })

  it('leaves an unspecified section undefined rather than parsing it', () => {
    const req = fakeReq({ body: { name: 'Bea' }, query: { x: 'y' } })
    const next = vi.fn() as unknown as NextFunction

    validate({ body: z.strictObject({ name: z.string() }) })(
      req,
      {} as Response,
      next
    )

    expect(req.valid).toEqual({ body: { name: 'Bea' } })
    expect(req.valid.query).toBeUndefined()
  })

  it('typed accessors read back the parsed sections', () => {
    const req = fakeReq({
      body: { name: 'Cira' },
      params: { id: 'cust_9' },
      query: { limit: '10' },
    })
    validate({
      body: z.strictObject({ name: z.string() }),
      params: z.object({ id: z.string() }),
      query: z.object({ limit: z.coerce.number().int() }),
    })(req, {} as Response, vi.fn() as unknown as NextFunction)

    expect(validBody<{ name: string }>(req)).toEqual({ name: 'Cira' })
    expect(validParams<{ id: string }>(req)).toEqual({ id: 'cust_9' })
    expect(validQuery<{ limit: number }>(req)).toEqual({ limit: 10 })
  })
})
