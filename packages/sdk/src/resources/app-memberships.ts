import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions, Result } from '../types/api.ts'
import {
  sdk876AppMembershipListSchema,
  sdk876AppMembershipSchema,
  sdk876EntitledAppsSchema,
  type AppMembership,
  type AppMembershipList,
} from '../types/app-memberships.ts'

const ENTITLED_STATUSES = new Set(['active', 'trialing'])

/** `$876.appMemberships.*` — acting-user app access only. */
export function createAppMembershipsResource(runtime: SdkRuntime) {
  async function retrieveMe(
    params: { organizationId: string; appId: string },
    requestOptions?: RequestOptions
  ): Promise<Result<AppMembership>> {
    return sendAuthRequest(
      runtime,
      'GET',
      `/organizations/${params.organizationId}/apps/${params.appId}/members/me`,
      undefined,
      sdk876AppMembershipSchema,
      requestOptions
    )
  }

  return {
    me: {
      /** Returns the acting member's effective access for one app. */
      retrieve: retrieveMe,
    },

    /**
     * Returns one self-scoped profile per app the organization is entitled to.
     * This deliberately does not call the organization-wide app-membership list.
     */
    async list(
      params: { organizationId: string },
      requestOptions?: RequestOptions
    ): Promise<Result<AppMembershipList>> {
      const entitlements = await sendAuthRequest(
        runtime,
        'GET',
        `/organizations/${params.organizationId}/apps`,
        undefined,
        sdk876EntitledAppsSchema,
        requestOptions
      )
      if (entitlements.error)
        return { data: null, error: entitlements.error }

      const profiles = await Promise.all(
        entitlements.data
          .filter((entitlement) => ENTITLED_STATUSES.has(entitlement.status))
          .map((entitlement) =>
            retrieveMe(
              { organizationId: params.organizationId, appId: entitlement.app_id },
              requestOptions
            )
          )
      )

      const failed = profiles.find((result) => result.error !== null)
      if (failed?.error) return { data: null, error: failed.error }

      const data = profiles.flatMap((result) =>
        result.data === null ? [] : [result.data]
      )
      const list = {
        object: 'list' as const,
        data,
        has_more: false,
        url: `/organizations/${params.organizationId}/app-memberships/me`,
      }
      const parsed = sdk876AppMembershipListSchema.safeParse(list)
      if (!parsed.success)
        return {
          data: null,
          error: {
            code: 'app-access/invalid-response',
            message: 'The app access response could not be validated.',
          },
        }
      return { data: parsed.data, error: null }
    },
  }
}
