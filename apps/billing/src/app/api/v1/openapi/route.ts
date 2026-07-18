import { apiSuccess } from '@876/core/api'

import { OpenApiDocument } from '@/lib/api/openapi'

export const dynamic = 'force-static'

/** Returns the OpenAPI 3.1 contract for the versioned Billing API. */
export function GET() {
  return apiSuccess(OpenApiDocument)
}
