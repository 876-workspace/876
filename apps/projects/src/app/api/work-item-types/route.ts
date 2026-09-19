import type { NextRequest } from 'next/server'

import { createWorkStructureResource } from '@/lib/api/work-structure'
import { projects } from '@/lib/clients/projects'
import { workItemTypeInputSchema } from '@/types/work-structure'

export const runtime = 'nodejs'

export function POST(request: NextRequest) {
  return createWorkStructureResource(
    request,
    workItemTypeInputSchema,
    (orgId, input) => projects.workItemTypes.create(orgId, input),
    'Enter a valid work item type.'
  )
}
