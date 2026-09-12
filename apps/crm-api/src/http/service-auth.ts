import type { NextFunction, Request, Response } from 'express'

import { secretsMatch } from './internal-auth.js'
import { parseSupportServiceKeys } from './support-service-auth.js'

const SERVICE_APP_HEADER = 'x-876-service-app'
const SERVICE_KEY_HEADER = 'x-876-service-key'
const SERVICE_APPS = new Set([
  '876-crm',
  '876-console',
  '876-invoice',
  '876-billing',
])

function unauthorized(res: Response) {
  return res.status(401).json({
    data: null,
    error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
  })
}

/** Authenticates a first-party caller without sharing CRM's operational key. */
export function requireServiceApp(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const appSlug = req.header(SERVICE_APP_HEADER)?.trim() ?? ''
  const provided = req.header(SERVICE_KEY_HEADER)?.trim() ?? ''
  if (!SERVICE_APPS.has(appSlug)) return unauthorized(res)
  const configured = parseSupportServiceKeys(process.env.CRM_SERVICE_KEYS)[
    appSlug
  ]

  if (!configured || !secretsMatch(provided, configured)) return unauthorized(res)

  res.locals.crmServiceAppSlug = appSlug
  next()
}

/** Allows operational callers while retaining the service caller identity. */
export function requireInternalOrServiceApp(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const internal = req.header('x-internal-key')?.trim() ?? ''
  const expected = process.env.CRM_INTERNAL_KEY
  if (expected && secretsMatch(internal, expected)) return next()

  return requireServiceApp(req, res, next)
}
