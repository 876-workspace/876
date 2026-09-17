import type { NextRequest } from 'next/server'

import {
  deleteWorkStructureResource,
  updateWorkStructureResource,
} from '@/lib/api/work-structure'
import { projects } from '@/lib/services/projects'
import { updateCustomFieldInputSchema } from '@/types/work-structure'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export function PATCH(request: NextRequest, context: Context) {
  return updateWorkStructureResource(
    request,
    context,
    updateCustomFieldInputSchema,
    (orgId, id, input) => projects.customFields.update(orgId, id, input),
    'Enter a valid custom field update.'
  )
}

export function DELETE(_request: NextRequest, context: Context) {
  return deleteWorkStructureResource(context, (orgId, id) =>
    projects.customFields.delete(orgId, id)
  )
}
