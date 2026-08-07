import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateModuleBody,
  EntitlementsQuery,
  ListModulesQuery,
  UpdateModuleBody,
} from './modules.schemas'
import * as service from './modules.service'

export async function listModules(req: Request, res: Response): Promise<void> {
  res
    .status(200)
    .json(await service.listModules(validQuery<ListModulesQuery>(req)))
}

export async function listEntitledModules(
  req: Request,
  res: Response
): Promise<void> {
  res
    .status(200)
    .json(await service.listEntitledModules(validQuery<EntitlementsQuery>(req)))
}

export async function retrieveModule(
  req: Request,
  res: Response
): Promise<void> {
  const { module_id } = validParams<{ module_id: string }>(req)

  res.status(200).json(await service.retrieveModule(module_id))
}

export async function createModule(req: Request, res: Response): Promise<void> {
  res
    .status(201)
    .json(await service.createModule(validBody<CreateModuleBody>(req)))
}

export async function updateModule(req: Request, res: Response): Promise<void> {
  const { module_id } = validParams<{ module_id: string }>(req)
  const body = validBody<UpdateModuleBody>(req)
  // Clearing a field and leaving it alone are different intents, so the update
  // reads which keys were sent rather than which values are non-null.
  const provided = new Set(Object.keys((req.body ?? {}) as object))

  res.status(200).json(await service.updateModule(module_id, body, provided))
}

export async function archiveModule(
  req: Request,
  res: Response
): Promise<void> {
  const { module_id } = validParams<{ module_id: string }>(req)

  res.status(200).json(await service.archiveModule(module_id))
}
