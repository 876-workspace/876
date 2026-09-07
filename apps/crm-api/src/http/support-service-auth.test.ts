import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  parseSupportServiceKeys,
  requireSupportService,
} from './support-service-auth.js'

function request(headers: Record<string, string>): Request {
  return {
    header(name: string) {
      return headers[name.toLowerCase()]
    },
  } as Request
}

function response() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { res: { status, locals: {} } as unknown as Response, status, json }
}

afterEach(() => {
  delete process.env.CRM_SUPPORT_SERVICE_KEYS
})

describe('support service auth', () => {
  it('parses non-empty app-specific keys', () => {
    expect(
      parseSupportServiceKeys(
        JSON.stringify({ '876-billing': ' billing-key ', '876-invoice': '' })
      )
    ).toEqual({ '876-billing': 'billing-key' })
  })

  it('treats malformed configuration as empty', () => {
    expect(parseSupportServiceKeys('{bad-json')).toEqual({})
  })

  it('rejects a missing service credential', () => {
    process.env.CRM_SUPPORT_SERVICE_KEYS = JSON.stringify({
      '876-billing': 'billing-key',
    })
    const { res, status, json } = response()
    const next = vi.fn() as NextFunction

    requireSupportService(request({}), res, next)

    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a key that belongs to another host app', () => {
    process.env.CRM_SUPPORT_SERVICE_KEYS = JSON.stringify({
      '876-billing': 'billing-key',
      '876-invoice': 'invoice-key',
    })
    const { res, status } = response()
    const next = vi.fn() as NextFunction

    requireSupportService(
      request({
        'x-876-service-app': '876-invoice',
        'x-876-service-key': 'billing-key',
      }),
      res,
      next
    )

    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('accepts the key bound to the presented host app', () => {
    process.env.CRM_SUPPORT_SERVICE_KEYS = JSON.stringify({
      '876-billing': 'billing-key',
    })
    const { res, status } = response()
    const next = vi.fn() as NextFunction

    requireSupportService(
      request({
        'x-876-service-app': '876-billing',
        'x-876-service-key': 'billing-key',
      }),
      res,
      next
    )

    expect(status).not.toHaveBeenCalled()
    expect(res.locals.crmServiceAppSlug).toBe('876-billing')
    expect(next).toHaveBeenCalledOnce()
  })
})
