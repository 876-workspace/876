import type { NextRequest } from 'next/server'

import { createWorkStructureResource } from '@/lib/api/work-structure'
import { projects } from '@/lib/services/projects'
import { workflowStateInputSchema } from '@/types/work-structure'

export const runtime = 'nodejs'

export function POST(request: NextRequest) {
  return createWorkStructureResource(
    request,
    workflowStateInputSchema,
    (orgId, input) => projects.workflowStates.create(orgId, input),
    'Enter a valid workflow state.'
  )
}
