import { buildClientQuery } from '@876/core/client'

import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import { sdk876FeatureListSchema } from '../types/features.ts'
import type { FeatureListResult } from '../types/features.ts'

export function createFeaturesResource(runtime: SdkRuntime) {
  return {
    evaluate(
      params: {
        organizationId?: string | undefined
        appSlug?: string | undefined
      } = {},
      requestOptions?: RequestOptions
    ): Promise<FeatureListResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/features/evaluate/me${buildClientQuery(params)}`,
        undefined,
        sdk876FeatureListSchema,
        requestOptions
      )
    },
  }
}
