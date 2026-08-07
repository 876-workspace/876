import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type { ProvisioningDraftReplace } from './provisioning.schemas'
import * as service from './provisioning.service'

export async function retrieveCatalog(
  req: Request,
  res: Response
): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const result = await service.retrieveCatalog(target_type, target_key)
  res.status(200).json(result)
}

export async function retrieveManifest(
  req: Request,
  res: Response
): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const result = await service.retrieveManifest(target_type, target_key)
  res.status(200).json(result)
}

export async function retrievePublished(
  req: Request,
  res: Response
): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const result = await service.retrievePublished(target_type, target_key)
  res.status(200).json(result)
}

export async function replaceDraft(req: Request, res: Response): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const body = validBody<ProvisioningDraftReplace>(req)
  const result = await service.replaceDraft(target_type, target_key, body)
  res.status(200).json(result)
}

export async function validateDraft(
  req: Request,
  res: Response
): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const body = validBody<ProvisioningDraftReplace>(req)
  const result = await service.validateDraftRequest(
    target_type,
    target_key,
    body
  )
  res.status(200).json(result)
}

export async function publishDraft(req: Request, res: Response): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const result = await service.publishDraft(target_type, target_key)
  res.status(200).json(result)
}

export async function listRuns(req: Request, res: Response): Promise<void> {
  const query = validQuery<{
    organization_id?: string
    app_id?: string
    status?: string
    limit: number
    starting_after?: string
    ending_before?: string
  }>(req)
  const result = await service.listRuns(query)
  res.status(200).json(result)
}

export async function claimApplicationRun(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<{ organization_id: string; app_id: string }>(req)
  const result = await service.claimApplicationRun(body)
  res.status(200).json(result)
}

export async function reconcileRuns(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<{
    app_id?: string | null
    organization_id?: string | null
    limit: number
    starting_after?: string | null
  }>(req)
  const result = await service.reconcileRuns(body)
  res.status(200).json(result)
}

export async function retrieveRun(req: Request, res: Response): Promise<void> {
  const { run_id } = validParams<{ run_id: string }>(req)
  const result = await service.retrieveRun(run_id)
  res.status(200).json(result)
}

export async function retryRun(req: Request, res: Response): Promise<void> {
  const { run_id } = validParams<{ run_id: string }>(req)
  const result = await service.retryRun(run_id)
  res.status(200).json(result)
}

export async function completeApplicationRun(
  req: Request,
  res: Response
): Promise<void> {
  const { run_id } = validParams<{ run_id: string }>(req)
  const body = validBody<{
    status: 'succeeded' | 'failed'
    error?: string | null
  }>(req)
  const result = await service.completeApplicationRun(run_id, body)
  res.status(200).json(result)
}

export async function listNotes(req: Request, res: Response): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const query = validQuery<{
    limit: number
    starting_after?: string
    ending_before?: string
  }>(req)
  const result = await service.listNotes(target_type, target_key, query)
  res.status(200).json(result)
}

export async function createNote(req: Request, res: Response): Promise<void> {
  const { target_type, target_key } = validParams<{
    target_type: string
    target_key: string
  }>(req)
  const body = validBody<{ body: string; author_user_id?: string | null }>(req)
  const result = await service.createNote(target_type, target_key, body)
  res.status(201).json(result)
}

export async function deleteNote(req: Request, res: Response): Promise<void> {
  const { target_type, target_key, note_id } = validParams<{
    target_type: string
    target_key: string
    note_id: string
  }>(req)
  const result = await service.deleteNote(target_type, target_key, note_id)
  res.status(200).json(result)
}
