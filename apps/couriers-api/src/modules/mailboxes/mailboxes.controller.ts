import type { Request, Response } from 'express'

import { listObject } from '@/http/envelope'
import { validParams, validQuery } from '@/http/middleware/validate'

import * as service from './mailboxes.service'
import type { ListMailboxesQuery, TenantIdParams } from './mailboxes.schemas'

export async function listMailboxes(req: Request, res: Response) {
  const { tenantId } = validParams<TenantIdParams>(req)
  const query = validQuery<ListMailboxesQuery>(req)
  const result = await service.listMailboxes(tenantId, query)

  res.status(200).json(
    listObject({
      data: result.data,
      hasMore: result.hasMore,
      url: `/v1/tenants/${tenantId}/mailboxes`,
    })
  )
}

export async function allocateMailbox(req: Request, res: Response) {
  const { tenantId } = validParams<TenantIdParams>(req)

  res.status(200).json(await service.allocateMailbox(tenantId))
}
