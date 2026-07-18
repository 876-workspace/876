import { PLATFORM_APP_SLUGS } from '@876/core/platform-apps'

/** Core 876 app slug for the consumer app. */
export const CONSUMER_APP_SLUG =
  process.env.NEXT_PUBLIC_876_APP_SLUG ?? PLATFORM_APP_SLUGS.consumer
