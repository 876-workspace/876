import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateApiKeyBody,
  UpdateApiKeyBody,
  CreateAppBody,
  ListAppsQuery,
} from './apps.schemas'
import * as service from './apps.service'

export async function listApps(req: Request, res: Response): Promise<void> {
  const query = validQuery<ListAppsQuery>(req)
  const principal = getPrincipal(req)
  const result = await service.listApps(query, principal.internal)
  res.status(200).json(result)
}

export async function createApp(req: Request, res: Response): Promise<void> {
  const body = validBody<CreateAppBody>(req)
  const result = await service.createApp(body)
  res.status(201).json(result)
}

export async function getAppPublic(req: Request, res: Response): Promise<void> {
  const { clientId } = validParams<{ clientId: string }>(req)
  const result = await service.getAppPublic(clientId)
  res.status(200).json(result)
}

export async function getCurrentApp(
  req: Request,
  res: Response
): Promise<void> {
  const principal = getPrincipal(req)
  const result = await service.getCurrentApp(principal.appId)
  res.status(200).json(result)
}

export async function getApp(req: Request, res: Response): Promise<void> {
  const { appId } = validParams<{ appId: string }>(req)
  const result = await service.getApp(appId)
  res.status(200).json(result)
}

export async function updateApp(req: Request, res: Response): Promise<void> {
  const { appId } = validParams<{ appId: string }>(req)
  const body = validBody<Record<string, unknown>>(req)

  // Map wire snake fields to Prisma camel fields
  const updates: Record<string, unknown> = {}
  if ('name' in body) updates.name = body.name
  if ('logoUrl' in body) updates.logoUrl = body.logoUrl
  if ('logoFileId' in body) updates.logoFileId = body.logoFileId
  if ('homepageUrl' in body) updates.homepageUrl = body.homepageUrl
  if ('appKind' in body) updates.appKind = body.appKind
  if ('status' in body) updates.status = body.status
  if ('organizationId' in body) updates.organizationId = body.organizationId

  // Also handle case where Zod passed original keys with underscores? Actually updateAppBodySchema uses snake keys
  // but we map above.

  const result = await service.updateApp(appId, updates)
  res.status(200).json(result)
}

export async function deleteApp(req: Request, res: Response): Promise<void> {
  const { appId } = validParams<{ appId: string }>(req)
  const result = await service.deleteApp(appId)
  res.status(200).json(result)
}

export async function listAppFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const { appId } = validParams<{ appId: string }>(req)
  const query = validQuery<{
    limit: number
    startingAfter?: string
    endingBefore?: string
    rootOnly?: boolean
    includeTag?: string
    excludeTag?: string
  }>(req)
  const result = await service.listAppFeatures(appId, {
    limit: query.limit,
    startingAfter: query.startingAfter,
    endingBefore: query.endingBefore,
    rootOnly: query.rootOnly,
    includeTag: query.includeTag,
    excludeTag: query.excludeTag,
  })
  res.status(200).json(result)
}

export async function listAppSubscriptions(
  req: Request,
  res: Response
): Promise<void> {
  const { appId } = validParams<{ appId: string }>(req)
  const result = await service.listAppSubscriptions(appId)
  res.status(200).json(result)
}

export async function createApiKey(req: Request, res: Response): Promise<void> {
  const { appId } = validParams<{ appId: string }>(req)
  const body = validBody<CreateApiKeyBody>(req)
  const result = await service.createApiKey(appId, body)
  res.status(201).json(result)
}

export async function listApiKeys(req: Request, res: Response): Promise<void> {
  const { appId } = validParams<{ appId: string }>(req)
  const query = validQuery<{
    limit: number
    startingAfter?: string
    endingBefore?: string
  }>(req)
  const result = await service.listApiKeys(appId, query)
  res.status(200).json(result)
}

export async function updateApiKey(req: Request, res: Response): Promise<void> {
  const { appId, key_id } = validParams<{ appId: string; key_id: string }>(
    req
  )
  const body = validBody<UpdateApiKeyBody>(req)
  const result = await service.updateApiKey(appId, key_id, body)
  res.status(200).json(result)
}

export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  const { appId, key_id } = validParams<{ appId: string; key_id: string }>(
    req
  )
  const result = await service.revokeApiKey(appId, key_id)
  res.status(200).json(result)
}

export async function deleteApiKey(req: Request, res: Response): Promise<void> {
  const { appId, key_id } = validParams<{ appId: string; key_id: string }>(
    req
  )
  const result = await service.deleteApiKey(appId, key_id)
  res.status(200).json(result)
}
