import type { create876Client as createPlatformClient } from '@876/sdk'

type Platform = ReturnType<typeof createPlatformClient>

export function createFeaturesResource(platform: Platform) : any {
  return (platform as unknown as { features: unknown }).features
}
