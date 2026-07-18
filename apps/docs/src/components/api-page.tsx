import { createAPIPage } from 'fumadocs-openapi/ui'
import { openapi } from '@/lib/openapi'

/**
 * The Swagger-style API renderer, bound to our committed OpenAPI snapshot.
 *
 * The interactive playground is disabled (`playground.enabled = false`) so the
 * docs render request/response schemas read-only — the auth endpoints mutate
 * real state and set sessions, so a live "Try it" is intentionally deferred.
 */
export const APIPage = createAPIPage(openapi, {
  playground: { enabled: false },
  showResponseSchema: true,
})
