import { PLATFORM_APP_SLUGS } from '@876/core/platform-apps'

/** Core 876 app slug for Console's own app record. */
export const CONSOLE_APP_SLUG =
  process.env.NEXT_PUBLIC_876_APP_SLUG ?? PLATFORM_APP_SLUGS.console
