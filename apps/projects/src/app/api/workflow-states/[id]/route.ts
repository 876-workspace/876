import type { NextRequest } from 'next/server'

import {
  deleteWorkStructureResource,
  updateWorkStructureResource,
} from '@/lib/api/work-structure'
import { projects } from '@/lib/services/projects'
import { updateWorkflowStateInputSchema } from '@/types/work-structure'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export function PATCH(request: NextRequest, context: Context) {
  return updateWorkStructureResource(
    request,
    context,
    updateWorkflowStateInputSchema,
    (orgId, id, input) => projects.workflowStates.update(orgId, id, input),
    'Enter a valid workflow state update.'
  )
}

export function DELETE(_request: NextRequest, context: Context) {
  return deleteWorkStructureResource(context, (orgId, id) =>
    projects.workflowStates.delete(orgId, id)
  )
}
