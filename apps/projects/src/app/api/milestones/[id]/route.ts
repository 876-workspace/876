import type { NextRequest } from 'next/server'

import {
  deleteWorkStructureResource,
  updateWorkStructureResource,
} from '@/lib/api/work-structure'
import { projects } from '@/lib/clients/projects'
import { updateMilestoneInputSchema } from '@/types/work-structure'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export function PATCH(request: NextRequest, context: Context) {
  return updateWorkStructureResource(
    request,
    context,
    updateMilestoneInputSchema,
    (orgId, id, input) => projects.milestones.update(orgId, id, input),
    'Enter a valid milestone update.'
  )
}

export function DELETE(_request: NextRequest, context: Context) {
  return deleteWorkStructureResource(context, (orgId, id) =>
    projects.milestones.delete(orgId, id)
  )
}
