import type { Request, Response } from 'express'
import { z } from 'zod'

import { sendProjectsList } from '../../http/result.js'
import { organizationParamsSchema, milestoneStatusSchema } from './work-structure.schemas.js'
import { listOrganizationMilestones } from './milestone-list.service.js'

const querySchema = z.strictObject({
  status: milestoneStatusSchema.optional(),
})

export async function listOrganizationMilestonesController(
  req: Request,
  res: Response
) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const { status } = querySchema.parse(req.query)

  return sendProjectsList(
    res,
    await listOrganizationMilestones(organizationId, status),
    `/v1/organizations/${organizationId}/milestones/all`
  )
}
