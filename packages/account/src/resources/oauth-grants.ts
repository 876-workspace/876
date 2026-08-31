import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  sdk876OAuthGrantSchema,
  sdk876RevokeOAuthGrantSchema,
} from '../types/oauth-grants.ts'
import type {
  OAuthGrantListResult,
  RevokeOAuthGrantResult,
} from '../types/oauth-grants.ts'

/**
 * `$876.oauthGrants.*` — apps the user has connected via "Sign in with 876"
 * (first-party, API-key tier). Backs the "linked apps" screen.
 */
export function createOAuthGrantsResource(runtime: SdkRuntime) {
  return {
    /**
     * Lists the apps a user has authorized.
     *
     * @see GET /users/{user_id}/oauth-grants
     */
    list(
      userId: string,
      requestOptions?: RequestOptions
    ): Promise<OAuthGrantListResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/users/${userId}/oauth-grants`,
        undefined,
        sdk876OAuthGrantSchema.array(),
        requestOptions
      )
    },

    /**
     * Revokes a user's authorization for a connected app.
     *
     * @see POST /users/{user_id}/oauth-grants/{grant_id}/revoke
     */
    revoke(
      userId: string,
      grantId: string,
      requestOptions?: RequestOptions
    ): Promise<RevokeOAuthGrantResult> {
      return sendAuthRequest(
        runtime,
        'POST',
        `/users/${userId}/oauth-grants/${grantId}/revoke`,
        undefined,
        sdk876RevokeOAuthGrantSchema,
        requestOptions
      )
    },
  }
}
