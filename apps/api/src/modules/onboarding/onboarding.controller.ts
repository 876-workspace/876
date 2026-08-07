/** Read validated input, call one service function, pick a status code. */

import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CountryQuery,
  OnboardingAnswersReplace,
  OnboardingTargetType,
} from './onboarding.schemas'
import * as service from './onboarding.service'

type CatalogParams = {
  target_type: OnboardingTargetType
  target_key: string
}

type SessionParams = CatalogParams & { organization_id: string }

export function retrieveCatalog(req: Request, res: Response): void {
  const { target_type, target_key } = validParams<CatalogParams>(req)
  const { country_code } = validQuery<CountryQuery>(req)

  res
    .status(200)
    .json(service.retrieveCatalog(target_type, target_key, country_code))
}

export async function retrieveSession(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id, target_type, target_key } =
    validParams<SessionParams>(req)
  const { country_code } = validQuery<CountryQuery>(req)

  res.status(200).json(
    await service.retrieveSession({
      organizationId: organization_id,
      targetType: target_type,
      targetKey: target_key,
      countryCode: country_code,
    })
  )
}

export async function replaceAnswers(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id, target_type, target_key } =
    validParams<SessionParams>(req)
  const body = validBody<OnboardingAnswersReplace>(req)

  res.status(200).json(
    await service.replaceAnswers({
      organizationId: organization_id,
      targetType: target_type,
      targetKey: target_key,
      body,
    })
  )
}

export function validateAnswers(req: Request, res: Response): void {
  const { target_type, target_key } = validParams<CatalogParams>(req)
  const body = validBody<OnboardingAnswersReplace>(req)

  res.status(200).json(service.validateAnswers(target_type, target_key, body))
}

export async function submitSession(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id, target_type, target_key } =
    validParams<SessionParams>(req)
  const { country_code } = validQuery<CountryQuery>(req)

  res.status(200).json(
    await service.submitSession({
      organizationId: organization_id,
      targetType: target_type,
      targetKey: target_key,
      countryCode: country_code,
    })
  )
}
