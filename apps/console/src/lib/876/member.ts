import 'server-only'

import { create876ServerClient } from '@876/client/server'

/**
 * Ordinary, member-scoped 876 client used by Console-hosted product surfaces.
 * The factory—not a nested namespace—keeps these calls distinct from the
 * privileged Console client exported by `@/lib/876`.
 */
export const $876Member = create876ServerClient({
  widgets: {
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
    host: 'console',
  },
})
