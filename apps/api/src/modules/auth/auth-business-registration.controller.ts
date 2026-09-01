import type { Request, Response } from 'express'

import { getAppId } from '@/http/auth'
import { validBody } from '@/http/middleware/validate'

import type { RegisterBusinessBody } from './auth.schemas'
import { serializeAuthEvent } from './auth.serializers'
import * as service from './auth.service'

function pickFirst<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value
  }
  return undefined
}

/**
 * Register a business with the canonical organization country required by the
 * Phase-2 provisioning resolver.
 *
 * The country is validated by the route schema before reaching this handler.
 * Currency/language remain compatibility inputs only; the selected setup's v1
 * workspace defaults replace them during the first persisted selection.
 */
export async function registerBusiness(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<RegisterBusinessBody>(req)
  const firstName = pickFirst(body.firstName, body.first_name) ?? ''
  const lastName = pickFirst(body.lastName, body.last_name) ?? ''
  const organizationName =
    pickFirst(body.organizationName, body.organization_name) ?? ''
  const organizationSlug =
    pickFirst(body.organizationSlug, body.organization_slug) ?? null
  const countryCode = pickFirst(body.countryCode, body.country_code) ?? ''

  const authService = service.getAuthService()
  const result = await authService.registerBusiness({
    email: body.email,
    password: body.password,
    firstName,
    lastName,
    organizationName,
    organizationSlug,
    countryCode,
    currencyCode: pickFirst(body.currencyCode, body.currency_code) ?? null,
    language: body.language ?? null,
    sourceAppId: getAppId(req),
  })

  if (result.status === 'pending') {
    await service.recordFailure(
      req,
      'register_business',
      body.email,
      result.event.kind
    )
    res.status(200).json(serializeAuthEvent(result.event))
    return
  }

  const session = await service.completeAuth({
    req,
    res: res as never,
    result: result as never,
    event: 'register_business',
    appId: getAppId(req),
  })
  res.status(200).json(session)
}
