import type { Request, Response } from 'express'

import { validBody } from '@/http/middleware/validate'
import { workspace } from '@/services/workspace'

import type { OrganizationCreateBody } from './organizations.schemas'
import * as service from './organizations.service'

/**
 * Admin organization creation with the same Phase-2 provisioning completion
 * contract as signup/bootstrap paths.
 *
 * `service.createOrganization()` creates the durable organization and runs the
 * fresh setup resolver before setup-driven app/finance writes. Work is applied
 * only after that persisted selection exists, so `service/work` and capability
 * rows control the tenant rather than a hardcoded product dependency.
 */
export async function createOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<OrganizationCreateBody>(req)
  const organization = await service.createOrganization(body)
  await workspace.work.ensure({ organizationId: organization.id })
  res.status(201).json(organization)
}
