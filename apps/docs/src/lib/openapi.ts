import { createOpenAPI } from 'fumadocs-openapi/server'

/**
 * OpenAPI server backed by the committed snapshot at `apps/docs/openapi.json`.
 *
 * The snapshot is produced from the FastAPI app via `pnpm sync:openapi`, so the
 * docs build never depends on a live API server. Regenerate the snapshot
 * whenever API contracts change.
 */
export const openapi = createOpenAPI({
  input: ['./openapi.json'],
})
