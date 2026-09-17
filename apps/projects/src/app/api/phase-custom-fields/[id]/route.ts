import type { NextRequest } from 'next/server'

import {
  deleteWorkStructureResource,
  updateWorkStructureResource,
} from '@/lib/api/work-structure'
import { updatePhaseCustomFieldInputSchema } from '@/types/work-structure'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export function PATCH(request: NextRequest, context: Context) {
  return updateWorkStructureResource(
    request,
    context,
    updatePhaseCustomFieldInputSchema,
    (orgId, id, input) =>
      projects.milestones.customFields.update(orgId, id, input),
    'Enter a valid phase custom field update.'
  )
}

export function DELETE(_request: NextRequest, context: Context) {
  return deleteWorkStructureResource(context, (orgId, id) =>
    projects.milestones.customFields.delete(orgId, id)
  )
}
