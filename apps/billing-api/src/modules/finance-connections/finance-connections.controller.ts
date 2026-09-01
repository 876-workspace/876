import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { errors } from '@/http/errors'
import { listBankAccounts } from '@/modules/banking'

import {
  financeProvisioningEventSchema,
  type FinanceProvisioningEvent,
} from './finance-connections.schemas'
import {
  ensureFinanceConnection,
  platformAppStats,
} from './finance-connections.service'

function parseEvent(body: unknown): FinanceProvisioningEvent {
  const result = financeProvisioningEventSchema.safeParse(body)
  if (!result.success) throw errors.validation(undefined, result.error.issues)
  return result.data
}

export const financeConnectionsController = {
  async ensure(req: Request, res: Response) {
    res.json(await ensureFinanceConnection(parseEvent(req.body)))
  },
  async stats(_req: Request, res: Response) {
    res.json({ object: 'list', data: await platformAppStats() })
  },
  async statsForApp(req: Request, res: Response) {
    const value = req.params.sourceAppId
    res.json(
      await platformAppStats(
        Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
      )
    )
  },
  async integrationBankAccounts(req: Request, res: Response) {
    const tenantId = getPrincipal(req).tenantId
    if (!tenantId)
      throw new Error('Integration guard did not resolve a tenant.')
    const result = await listBankAccounts(tenantId)
    res.json({ ...result, url: req.path })
  },
}
