'use client'

/**
 * Default identifier-resolution transport.
 *
 * @module @876/ui/auth/resolve-identifier
 */

import type { SDK876AuthClient } from '@876/sdk'

import type { AuthMethod, IdentifierResolution, SocialProvider } from './types'

/**
 * Builds the default email-resolution function using the auth client's resolve
 * method. Normalises the API response into an {@link IdentifierResolution}.
 *
 * Apps with a different endpoint can supply their own resolver through
 * {@link AuthUIConfig.resolveIdentifier} instead.
 *
 * @param client - The auth namespace from a `create876Client()` instance.
 */
export function createDefaultIdentifierResolver(
  client: SDK876AuthClient
): (identifier: string) => Promise<IdentifierResolution> {
  return async (identifier: string): Promise<IdentifierResolution> => {
    const trimmed = identifier.trim()

    const { data, error } = await client.resolve({ identifier: trimmed })

    // On any error, treat as "unknown account" so the flow falls back to
    // password entry rather than dead-ending the user.
    if (error || !data) {
      return {
        email: trimmed,
        exists: false,
        methods: ['password'],
        ssoProvider: null,
      }
    }

    return {
      email: data.email ?? trimmed,
      exists: data.exists ?? false,
      methods:
        data.methods && data.methods.length > 0
          ? (data.methods as AuthMethod[])
          : ['password'],
      ssoProvider:
        (data.ssoProvider as SocialProvider | null | undefined) ?? null,
    }
  }
}
