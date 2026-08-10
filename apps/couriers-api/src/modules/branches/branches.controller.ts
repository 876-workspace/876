import type { Request, Response } from 'express'

import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import * as service from './branches.service'
import type {
  BranchParams,
  CreateBranchBody,
  ListBranchesQuery,
  TenantIdParams,
  UpdateBranchBody,
} from './branches.schemas'

export async function listBranches(req: Request, res: Response): Promise<void> {
  const { tenantId } = validParams<TenantIdParams>(req)
  const query = validQuery<ListBranchesQuery>(req)
  const result = await service.listBranches(tenantId, query)
  res.status(200).json(
    listObject({
      data: result.branches,
      hasMore: result.hasMore,
      url: `/v1/tenants/${tenantId}/branches`,
    })
  )
}

export async function createBranch(req: Request, res: Response): Promise<void> {
  const { tenantId } = validParams<TenantIdParams>(req)
  const branch = await service.createBranch(
    tenantId,
    validBody<CreateBranchBody>(req)
  )
  res.status(201).json(branch)
}

export async function retrieveBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, id } = validParams<BranchParams>(req)
  res.status(200).json(await service.retrieveBranch(tenantId, id))
}

export async function updateBranch(req: Request, res: Response): Promise<void> {
  const { tenantId, id } = validParams<BranchParams>(req)
  const branch = await service.updateBranch(
    tenantId,
    id,
    validBody<UpdateBranchBody>(req)
  )
  res.status(200).json(branch)
}
