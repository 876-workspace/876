import type { Request, Response } from 'express'

import { validBody, validParams } from '@/http/middleware/validate'

import type { ProvisioningSetupPolicyReplace } from './provisioning-setup-policy.schemas'
import * as service from './provisioning-setup-policy.service'

export async function retrieveSetupPolicy(
  req: Request,
  res: Response
): Promise<void> {
  const { setup_key } = validParams<{ setup_key: string }>(req)
  const result = await service.retrieveSetupPolicy(setup_key)
  res.status(200).json(result)
}

export async function replaceSetupPolicy(
  req: Request,
  res: Response
): Promise<void> {
  const { setup_key } = validParams<{ setup_key: string }>(req)
  const body = validBody<ProvisioningSetupPolicyReplace>(req)
  const result = await service.replaceSetupPolicy(setup_key, body)
  res.status(200).json(result)
}
