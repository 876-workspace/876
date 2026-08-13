import 'server-only'

import { createWidgetsClient } from '@876/widgets/server'

/**
 * Ordinary, member-scoped widgets client used by Console-hosted product
 * surfaces. A distinct factory — not a nested namespace — keeps these calls
 * separate from the privileged Console client exported by `@/lib/876`.
 */
export const $876Member = createWidgetsClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
  host: 'console',
})
