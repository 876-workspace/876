import { buildClientQuery } from '@876/core/client'

import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  sdk876AppCreatedSchema,
  sdk876AppCreateParamsSchema,
  sdk876AppListSchema,
  sdk876AppSchema,
} from '../types/apps.ts'
import type {
  AppCreateParams,
  AppCreatedResult,
  AppListParams,
  AppListResult,
  AppResult,
} from '../types/apps.ts'
import { validateParams } from '../validation.ts'

/**
 * `$876.apps.*` — organization-owned registered apps (first-party API-key tier).
 *
 * Backs the developer portal. These call the non-`AdminDep` `/apps` routes;
 * platform-wide app administration stays in `@876/admin`.
 */
export function createAppsResource(runtime: SdkRuntime) {
  return {
    /**
     * Lists apps, optionally filtered by organization.
     *
     * @see GET /apps
     */
    list(
      params: AppListParams = {},
      requestOptions?: RequestOptions
    ): Promise<AppListResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/apps${buildClientQuery(params)}`,
        undefined,
        sdk876AppListSchema,
        requestOptions
      )
    },

    /**
     * Registers a new OAuth client. The result includes a one-time
     * `clientSecret` for confidential clients (store it immediately).
     *
     * @see POST /apps
     */
    create(
      params: AppCreateParams,
      requestOptions?: RequestOptions
    ): Promise<AppCreatedResult> {
      const validation = validateParams(sdk876AppCreateParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        '/apps',
        validation.data,
        sdk876AppCreatedSchema,
        requestOptions
      )
    },

    /**
     * Retrieves a single app by id.
     *
     * @see GET /apps/{app_id}
     */
    retrieve(
      appId: string,
      requestOptions?: RequestOptions
    ): Promise<AppResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/apps/${appId}`,
        undefined,
        sdk876AppSchema,
        requestOptions
      )
    },

    /**
     * Retrieves the app associated with this client's configured API key.
     *
     * @see GET /apps/current
     */
    current(requestOptions?: RequestOptions): Promise<AppResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        '/apps/current',
        undefined,
        sdk876AppSchema,
        requestOptions
      )
    },
  }
}
