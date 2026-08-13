import { createServiceClients } from '../internal/create-service-clients'
import { createCoreSurface } from './base'
import type { PlatformServerClientOptions } from '../internal/types'

export function createPlatformServerClient(
  options: PlatformServerClientOptions
) {
  const services = createServiceClients(options)
  if (services.platformAdmin) {
    return createCoreSurface({
      platform: services.platform,
      admin: services.platformAdmin,
    })
  }
  return createCoreSurface({ platform: services.platform })
}

export type Platform876Client = ReturnType<typeof createPlatformServerClient>
