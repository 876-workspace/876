import type { NextFunction, Request, Response } from 'express'

import { secretsMatch } from './internal-auth.js'

const SERVICE_APP_HEADER = 'x-876-service-app'
const SERVICE_KEY_HEADER = 'x-876-service-key'

function parseSupportServiceKeys(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {}

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const keys: Record<string, string> = {}
    for (const [appSlug, value] of Object.entries(parsed)) {
      if (typeof value !== 'string' || !value.trim()) continue
      keys[appSlug] = value.trim()
    }
    return keys
  } catch {
    return {}
  }
}

export function requireSupportService(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const appSlug = req.header(SERVICE_APP_HEADER)?.trim() ?? ''
  const provided = req.header(SERVICE_KEY_HEADER)?.trim() ?? ''
  const configured = parseSupportServiceKeys(
    process.env.CRM_SUPPORT_SERVICE_KEYS
  )[appSlug]

  if (!configured || !secretsMatch(provided, configured))
    return res.status(401).json({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })

  res.locals.crmServiceAppSlug = appSlug
  next()
}

export { parseSupportServiceKeys }
