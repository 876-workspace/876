import type { NextRequest } from 'next/server'

import { createWorkStructureResource } from '@/lib/api/work-structure'
import { phaseCustomFieldInputSchema } from '@/types/work-structure'
import { projects } from '@/lib/clients/projects'

export const runtime = 'nodejs'

export function POST(request: NextRequest) {
  return createWorkStructureResource(
    request,
    phaseCustomFieldInputSchema,
    (orgId, input) => projects.milestones.customFields.create(orgId, input),
    'Enter a valid phase custom field.'
  )
}
