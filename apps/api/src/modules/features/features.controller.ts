import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { AppHttpError } from '@/http/errors'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateFeatureBody,
  EvaluateFeaturesQuery,
  EvaluateMeQuery,
  GrantOrgFeatureBody,
  GrantUserFeatureBody,
  ListFeaturesQuery,
  UpdateFeatureBody,
  UpdateOrgFeatureBody,
  UpdateUserFeatureBody,
} from './features.schemas'
import * as service from './features.service'

function providedKeys(req: Request): Set<string> {
  return new Set(Object.keys((req.body ?? {}) as object))
}

export async function listFeatures(req: Request, res: Response): Promise<void> {
  res
    .status(200)
    .json(await service.listFeatures(validQuery<ListFeaturesQuery>(req)))
}

export async function createFeature(
  req: Request,
  res: Response
): Promise<void> {
  res
    .status(201)
    .json(await service.createFeature(validBody<CreateFeatureBody>(req)))
}

export async function retrieveFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { featureId } = validParams<{ featureId: string }>(req)
  res.status(200).json(await service.retrieveFeature(featureId))
}

export async function listFeatureGrants(
  req: Request,
  res: Response
): Promise<void> {
  const { featureId } = validParams<{ featureId: string }>(req)
  res.status(200).json(await service.listFeatureGrants(featureId))
}

export async function updateFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { featureId } = validParams<{ featureId: string }>(req)
  const body = validBody<UpdateFeatureBody>(req)
  res
    .status(200)
    .json(await service.updateFeature(featureId, body, providedKeys(req)))
}

export async function deleteFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { featureId } = validParams<{ featureId: string }>(req)
  res.status(200).json(await service.deleteFeature(featureId))
}

export async function evaluateFeatures(
  req: Request,
  res: Response
): Promise<void> {
  res
    .status(200)
    .json(
      await service.evaluateFeatures(validQuery<EvaluateFeaturesQuery>(req))
    )
}

export async function evaluateFeatureDetails(
  req: Request,
  res: Response
): Promise<void> {
  res
    .status(200)
    .json(
      await service.evaluateFeatureDetails(
        validQuery<EvaluateFeaturesQuery>(req)
      )
}

export async function evaluateMyFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const principal = getPrincipal(req)
  if (!principal.userId) {
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    })
  }
  const query = validQuery<EvaluateMeQuery>(req)
  res.status(200).json(
    await service.evaluateMyFeatures({
      userId: principal.userId,
      organizationId: query.organizationId ?? null,
      appId: principal.appId,
      appSlug: query.appSlug ?? null,
      internal: principal.internal,
    })
  )
}

export async function listUserFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = validParams<{ userId: string }>(req)
  res.status(200).json(await service.listUserFeatures(userId))
}

export async function grantUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = validParams<{ userId: string }>(req)
  const body = validBody<GrantUserFeatureBody>(req)
  res.status(201).json(await service.grantUserFeature(userId, body))
}

export async function updateUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, featureId } = validParams<{
    userId: string
    featureId: string
  }>(req)
  const body = validBody<UpdateUserFeatureBody>(req)
  res
    .status(200)
    .json(await service.updateUserFeature(userId, featureId, body))
}

export async function revokeUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, featureId } = validParams<{
    userId: string
    featureId: string
  }>(req)
  res.status(200).json(await service.revokeUserFeature(userId, featureId))
}

export async function listOrgFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const { organizationId } = validParams<{ organizationId: string }>(req)
  res.status(200).json(await service.listOrgFeatures(organizationId))
}

export async function grantOrgFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { organizationId } = validParams<{ organizationId: string }>(req)
  const body = validBody<GrantOrgFeatureBody>(req)
  res.status(201).json(await service.grantOrgFeature(organizationId, body))
}

export async function updateOrgFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { organizationId, featureId } = validParams<{
    organizationId: string
    featureId: string
  }>(req)
  const body = validBody<UpdateOrgFeatureBody>(req)
  res
    .status(200)
    .json(await service.updateOrgFeature(organizationId, featureId, body))
}

export async function revokeOrgFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { organizationId, featureId } = validParams<{
    organizationId: string
    featureId: string
  }>(req)
  res
    .status(200)
    .json(await service.revokeOrgFeature(organizationId, featureId))
}
