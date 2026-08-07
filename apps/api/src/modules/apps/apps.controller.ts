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
  const { client_id } = validParams<{ client_id: string }>(req)
  const result = await service.getAppPublic(client_id)
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
  const { app_id } = validParams<{ app_id: string }>(req)
  const result = await service.getApp(app_id)
  res.status(200).json(result)
}

export async function updateApp(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const body = validBody<Record<string, unknown>>(req)

  // Map wire snake fields to Prisma camel fields
  const updates: Record<string, unknown> = {}
  if ('name' in body) updates.name = body.name
  if ('logo_url' in body) updates.logoUrl = body.logo_url
  if ('logo_file_id' in body) updates.logoFileId = body.logo_file_id
  if ('homepage_url' in body) updates.homepageUrl = body.homepage_url
  if ('app_kind' in body) updates.appKind = body.app_kind
  if ('status' in body) updates.status = body.status
  if ('organization_id' in body) updates.organizationId = body.organization_id

  // Also handle case where Zod passed original keys with underscores? Actually updateAppBodySchema uses snake keys
  // but we map above.

  const result = await service.updateApp(app_id, updates)
  res.status(200).json(result)
}

export async function deleteApp(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const result = await service.deleteApp(app_id)
  res.status(200).json(result)
}

export async function listAppFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const query = validQuery<{
    limit: number
    starting_after?: string
    ending_before?: string
    rootOnly?: boolean
    includeTag?: string
    excludeTag?: string
  }>(req)
  const result = await service.listAppFeatures(app_id, {
    limit: query.limit,
    starting_after: query.starting_after,
    ending_before: query.ending_before,
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
  const { app_id } = validParams<{ app_id: string }>(req)
  const result = await service.listAppSubscriptions(app_id)
  res.status(200).json(result)
}

export async function createApiKey(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const body = validBody<CreateApiKeyBody>(req)
  const result = await service.createApiKey(app_id, body)
  res.status(201).json(result)
}

export async function listApiKeys(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const query = validQuery<{
    limit: number
    starting_after?: string
    ending_before?: string
  }>(req)
  const result = await service.listApiKeys(app_id, query)
  res.status(200).json(result)
}

export async function updateApiKey(req: Request, res: Response): Promise<void> {
  const { app_id, key_id } = validParams<{ app_id: string; key_id: string }>(
    req
  )
  const body = validBody<UpdateApiKeyBody>(req)
  const result = await service.updateApiKey(app_id, key_id, body)
  res.status(200).json(result)
}

export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  const { app_id, key_id } = validParams<{ app_id: string; key_id: string }>(
    req
  )
  const result = await service.revokeApiKey(app_id, key_id)
  res.status(200).json(result)
}

export async function deleteApiKey(req: Request, res: Response): Promise<void> {
  const { app_id, key_id } = validParams<{ app_id: string; key_id: string }>(
    req
  )
  const result = await service.deleteApiKey(app_id, key_id)
  res.status(200).json(result)
}
