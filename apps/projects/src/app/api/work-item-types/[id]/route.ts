import type { NextRequest } from 'next/server'

import {
  deleteWorkStructureResource,
  updateWorkStructureResource,
} from '@/lib/api/work-structure'
import { projects } from '@/lib/clients/projects'
import { updateWorkItemTypeInputSchema } from '@/types/work-structure'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export function PATCH(request: NextRequest, context: Context) {
  return updateWorkStructureResource(
    request,
    context,
    updateWorkItemTypeInputSchema,
    (orgId, id, input) => projects.workItemTypes.update(orgId, id, input),
    'Enter a valid work item type update.'
  )
}

export function DELETE(_request: NextRequest, context: Context) {
  return deleteWorkStructureResource(context, (orgId, id) =>
    projects.workItemTypes.delete(orgId, id)
  )
}
