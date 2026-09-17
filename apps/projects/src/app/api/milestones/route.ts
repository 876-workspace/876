import type { NextRequest } from 'next/server'

import { createWorkStructureResource } from '@/lib/api/work-structure'
import { projects } from '@/lib/services/projects'
import { milestoneInputSchema } from '@/types/work-structure'

export const runtime = 'nodejs'

export function POST(request: NextRequest) {
  return createWorkStructureResource(
    request,
    milestoneInputSchema,
    (orgId, input) => projects.milestones.create(orgId, input),
    'Enter a valid milestone.'
  )
}
