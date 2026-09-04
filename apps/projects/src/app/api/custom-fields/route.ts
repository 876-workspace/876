import type { NextRequest } from 'next/server'

import { createWorkStructureResource } from '@/lib/api/work-structure'
import { projects } from '@/lib/services/projects'
import { customFieldInputSchema } from '@/lib/work-structure-inputs'

export const runtime = 'nodejs'

export function POST(request: NextRequest) {
  return createWorkStructureResource(
    request,
    customFieldInputSchema,
    (orgId, input) => projects.customFields.create(orgId, input),
    'Enter a valid custom field.'
  )
}
