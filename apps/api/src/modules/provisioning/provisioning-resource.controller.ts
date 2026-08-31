import type { Request, Response } from 'express'

import { validBody, validParams } from '@/http/middleware/validate'

import type {
  ProvisioningSetupResourceCreate,
  ProvisioningSetupResourceUpdate,
} from './provisioning-resource.schemas'
import * as service from './provisioning-resource.service'

type ResourceParams = {
  setup_key: string
  resource_type: string
}

type ResourceItemParams = ResourceParams & {
  resource_key: string
}

export async function listSetupResources(
  req: Request,
  res: Response
): Promise<void> {
  const { setup_key, resource_type } = validParams<ResourceParams>(req)
  const result = await service.listSetupResources(setup_key, resource_type)
  res.status(200).json(result)
}

export async function createSetupResource(
  req: Request,
  res: Response
): Promise<void> {
  const { setup_key, resource_type } = validParams<ResourceParams>(req)
  const body = validBody<ProvisioningSetupResourceCreate>(req)
  const result = await service.createSetupResource(
    setup_key,
    resource_type,
    body
  )
  res.status(201).json(result)
}

export async function retrieveSetupResource(
  req: Request,
  res: Response
): Promise<void> {
  const { setup_key, resource_type, resource_key } =
    validParams<ResourceItemParams>(req)
  const result = await service.retrieveSetupResource(
    setup_key,
    resource_type,
    resource_key
  )
  res.status(200).json(result)
}

export async function updateSetupResource(
  req: Request,
  res: Response
): Promise<void> {
  const { setup_key, resource_type, resource_key } =
    validParams<ResourceItemParams>(req)
  const body = validBody<ProvisioningSetupResourceUpdate>(req)
  const result = await service.updateSetupResource(
    setup_key,
    resource_type,
    resource_key,
    body
  )
  res.status(200).json(result)
}

export async function deleteSetupResource(
  req: Request,
  res: Response
): Promise<void> {
  const { setup_key, resource_type, resource_key } =
    validParams<ResourceItemParams>(req)
  const result = await service.deleteSetupResource(
    setup_key,
    resource_type,
    resource_key
  )
  res.status(200).json(result)
}
