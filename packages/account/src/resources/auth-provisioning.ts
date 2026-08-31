import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  auth876RegisterBusinessParamsSchema,
  type RegisterBusinessParams,
} from '../types/business-registration.ts'
import {
  auth876RegisterResponseSchema,
  type RegisterBusinessResult,
} from '../types/auth.ts'
import { validateParams } from '../validation.ts'
import { createAuthResource as createBaseAuthResource } from './auth.ts'

/**
 * Phase-2 auth composition.
 *
 * Every existing auth operation stays on the established resource. Business
 * registration is overridden here because it now carries the canonical
 * organization routing facts used by provisioning setup selection.
 */
export function createAuthResource(runtime: SdkRuntime) {
  const base = createBaseAuthResource(runtime)

  return {
    ...base,

    registerBusiness(
      params: RegisterBusinessParams,
      requestOptions?: RequestOptions
    ): Promise<RegisterBusinessResult> {
      const validation = validateParams(
        auth876RegisterBusinessParamsSchema,
        params
      )
      if (validation.error) return Promise.resolve(validation)

      return sendAuthRequest(
        runtime,
        'POST',
        '/auth/register-business',
        validation.data,
        auth876RegisterResponseSchema,
        requestOptions
      )
    },
  }
}
