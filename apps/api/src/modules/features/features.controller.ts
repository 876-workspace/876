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
  const { feature_id } = validParams<{ feature_id: string }>(req)
  res.status(200).json(await service.retrieveFeature(feature_id))
}

export async function listFeatureGrants(
  req: Request,
  res: Response
): Promise<void> {
  const { feature_id } = validParams<{ feature_id: string }>(req)
  res.status(200).json(await service.listFeatureGrants(feature_id))
}

export async function updateFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { feature_id } = validParams<{ feature_id: string }>(req)
  const body = validBody<UpdateFeatureBody>(req)
  res
    .status(200)
    .json(await service.updateFeature(feature_id, body, providedKeys(req)))
}

export async function deleteFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { feature_id } = validParams<{ feature_id: string }>(req)
  res.status(200).json(await service.deleteFeature(feature_id))
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
  const { user_id } = validParams<{ user_id: string }>(req)
  res.status(200).json(await service.listUserFeatures(user_id))
}

export async function grantUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = validParams<{ user_id: string }>(req)
  const body = validBody<GrantUserFeatureBody>(req)
  res.status(201).json(await service.grantUserFeature(user_id, body))
}

export async function updateUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, feature_id } = validParams<{
    user_id: string
    feature_id: string
  }>(req)
  const body = validBody<UpdateUserFeatureBody>(req)
  res
    .status(200)
    .json(await service.updateUserFeature(user_id, feature_id, body))
}

export async function revokeUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, feature_id } = validParams<{
    user_id: string
    feature_id: string
  }>(req)
  res.status(200).json(await service.revokeUserFeature(user_id, feature_id))
}

export async function listOrgFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  res.status(200).json(await service.listOrgFeatures(organization_id))
}

export async function grantOrgFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const body = validBody<GrantOrgFeatureBody>(req)
  res.status(201).json(await service.grantOrgFeature(organization_id, body))
}

export async function updateOrgFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id, feature_id } = validParams<{
    organization_id: string
    feature_id: string
  }>(req)
  const body = validBody<UpdateOrgFeatureBody>(req)
  res
    .status(200)
    .json(await service.updateOrgFeature(organization_id, feature_id, body))
}

export async function revokeOrgFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id, feature_id } = validParams<{
    organization_id: string
    feature_id: string
  }>(req)
  res
    .status(200)
    .json(await service.revokeOrgFeature(organization_id, feature_id))
}
