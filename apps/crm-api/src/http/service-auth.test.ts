import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

import {
  requireInternalOrServiceApp,
  requireServiceApp,
} from './service-auth.js'
import { requireSupportService } from './support-service-auth.js'

function harness(headers: Record<string, string | undefined> = {}) {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request
  const res = { locals: {}, status } as unknown as Response
  const next = vi.fn() as unknown as NextFunction
  return { req, res, next, status, json }
}

afterEach(() => {
  delete process.env.CRM_SERVICE_KEYS
  delete process.env.CRM_INTERNAL_KEY
})

describe('requireServiceApp', () => {
  it('accepts a configured first-party service credential and records its slug', () => {
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-invoice': 'invoice-key',
    })
    const test = harness({
      'x-876-service-app': '876-invoice',
      'x-876-service-key': 'invoice-key',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(1)
    expect(test.next).toHaveBeenCalledWith()
    expect(test.res.locals).toEqual({ crmServiceAppSlug: '876-invoice' })
    expect(test.status).toHaveBeenCalledTimes(0)
    expect(test.json).toHaveBeenCalledTimes(0)
  })

  it('accepts the 876-couriers first-party service credential', () => {
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-couriers': 'couriers-key',
    })
    const test = harness({
      'x-876-service-app': '876-couriers',
      'x-876-service-key': 'couriers-key',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(1)
    expect(test.next).toHaveBeenCalledWith()
    expect(test.res.locals).toEqual({ crmServiceAppSlug: '876-couriers' })
    expect(test.status).toHaveBeenCalledTimes(0)
    expect(test.json).toHaveBeenCalledTimes(0)
  })

  it('rejects an undeclared app slug without calling the route', () => {
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-invoice': 'invoice-key',
    })
    const test = harness({
      'x-876-service-app': 'unknown-app',
      'x-876-service-key': 'invoice-key',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(0)
    expect(test.status).toHaveBeenCalledTimes(1)
    expect(test.status).toHaveBeenCalledWith(401)
    expect(test.json).toHaveBeenCalledTimes(1)
    expect(test.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(test.res.locals).toEqual({})
  })

  it('rejects a wrong key without recording caller attribution', () => {
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-invoice': 'invoice-key',
    })
    const test = harness({
      'x-876-service-app': '876-invoice',
      'x-876-service-key': 'wrong-key',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(0)
    expect(test.status).toHaveBeenCalledWith(401)
    expect(test.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(test.res.locals).toEqual({})
  })

  it('rejects a missing credential map', () => {
    const test = harness({
      'x-876-service-app': '876-invoice',
      'x-876-service-key': 'invoice-key',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(0)
    expect(test.status).toHaveBeenCalledWith(401)
    expect(test.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(test.res.locals).toEqual({})
  })

  it('rejects a malformed credential map', () => {
    process.env.CRM_SERVICE_KEYS = '{not-json'
    const test = harness({
      'x-876-service-app': '876-invoice',
      'x-876-service-key': 'invoice-key',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(0)
    expect(test.status).toHaveBeenCalledWith(401)
    expect(test.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(test.res.locals).toEqual({})
  })

  it('rejects a support-only key on an organization route', () => {
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-invoice': 'service-key',
    })
    process.env.CRM_SUPPORT_SERVICE_KEYS = JSON.stringify({
      '876-invoice': 'support-key',
    })
    const test = harness({
      'x-876-service-app': '876-invoice',
      'x-876-service-key': 'support-key',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(0)
    expect(test.status).toHaveBeenCalledWith(401)
    expect(test.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(test.res.locals).toEqual({})
  })

  it('trims valid credential headers before comparing them', () => {
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-billing': 'billing-key',
    })
    const test = harness({
      'x-876-service-app': ' 876-billing ',
      'x-876-service-key': ' billing-key ',
    })

    requireServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(1)
    expect(test.res.locals).toEqual({ crmServiceAppSlug: '876-billing' })
    expect(test.status).toHaveBeenCalledTimes(0)
    expect(test.json).toHaveBeenCalledTimes(0)
  })
})

describe('requireInternalOrServiceApp', () => {
  it('accepts an internal key without guessing an app slug', () => {
    process.env.CRM_INTERNAL_KEY = 'internal-key'
    const test = harness({ 'x-internal-key': 'internal-key' })

    requireInternalOrServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(1)
    expect(test.res.locals).toEqual({})
    expect(test.status).toHaveBeenCalledTimes(0)
    expect(test.json).toHaveBeenCalledTimes(0)
  })

  it('falls through from a wrong internal key to a valid service credential', () => {
    process.env.CRM_INTERNAL_KEY = 'internal-key'
    process.env.CRM_SERVICE_KEYS = JSON.stringify({ '876-crm': 'crm-key' })
    const test = harness({
      'x-internal-key': 'wrong-key',
      'x-876-service-app': '876-crm',
      'x-876-service-key': 'crm-key',
    })

    requireInternalOrServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(1)
    expect(test.res.locals).toEqual({ crmServiceAppSlug: '876-crm' })
    expect(test.status).toHaveBeenCalledTimes(0)
    expect(test.json).toHaveBeenCalledTimes(0)
  })

  it('rejects missing internal and service credentials without calling the route', () => {
    const test = harness()

    requireInternalOrServiceApp(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(0)
    expect(test.status).toHaveBeenCalledWith(401)
    expect(test.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(test.res.locals).toEqual({})
  })
})

describe('service credential plane separation', () => {
  it('rejects an organization service key on the support route', () => {
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-billing': 'service-key',
    })
    process.env.CRM_SUPPORT_SERVICE_KEYS = JSON.stringify({
      '876-billing': 'support-key',
    })
    const test = harness({
      'x-876-service-app': '876-billing',
      'x-876-service-key': 'service-key',
    })

    requireSupportService(test.req, test.res, test.next)

    expect(test.next).toHaveBeenCalledTimes(0)
    expect(test.status).toHaveBeenCalledWith(401)
    expect(test.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(test.res.locals).toEqual({})
  })
})
