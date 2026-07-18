import { orgs } from './orgs'

/**
 * Typed browser client for client-initiated mutations. Each resource maps to a
 * pure-transport route handler under `/api/*` that authorizes and calls `$876`.
 * Reads still happen in server components via the admin client — this surface
 * is mutations only.
 */
export const client = {
  orgs,
}

export { orgs } from './orgs'
export type { ClientResult } from '@/types/api'
