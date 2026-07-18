import { useEffect, useState } from 'react'

import type { SDK876AuthClient, SocialProvider } from './types'

const DEFAULT_SOCIAL_PROVIDERS: SocialProvider[] = [
  'google',
  'apple',
  'microsoft',
]

/**
 * Loads the social/SSO providers enabled on the platform via the SDK
 * (`GET /auth/providers`) instead of hardcoding a list per app. Apps may pass
 * an optional `allow` list to narrow the discovered providers to a subset.
 *
 * @param client - The auth SDK client from the auth UI config.
 * @param allow - Optional allow-list filter over the discovered providers.
 * @returns The provider ids to render, in the platform's display order.
 */
export function useSocialProviders(
  client: SDK876AuthClient,
  allow?: SocialProvider[]
): SocialProvider[] {
  const [providers, setProviders] = useState<SocialProvider[]>(() =>
    getInitialProviders(allow)
  )
  const allowKey = (allow ?? []).join(',')

  useEffect(() => {
    let active = true
    const initialProviders = getInitialProvidersFromKey(allowKey)
    setProviders(initialProviders)

    void client.getProviders().then((result) => {
      if (!active || result.error) return
      const allowSet = allowKey ? new Set(allowKey.split(',')) : null
      const ids = result.data.data
        .map((provider) => provider.id as SocialProvider)
        .filter((id) => !allowSet || allowSet.has(id))
      setProviders(ids)
    })

    return () => {
      active = false
    }
  }, [client, allowKey])

  return providers
}

function getInitialProviders(allow?: SocialProvider[]): SocialProvider[] {
  return allow?.length ? allow : DEFAULT_SOCIAL_PROVIDERS
}

function getInitialProvidersFromKey(allowKey: string): SocialProvider[] {
  return allowKey
    ? (allowKey.split(',') as SocialProvider[])
    : DEFAULT_SOCIAL_PROVIDERS
}
