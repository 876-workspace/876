import type { FileCallerAssertion } from './types/files'

/**
 * Serializes the caller assertion into the headers Storage authorizes against.
 *
 * The internal key proves only that some 876 service is calling; it never
 * proves that service may touch a given file. Naming the principal is what lets
 * Storage check it against the file's `owner_type`/`owner_id`/`audience` — so
 * every endpoint that resolves a file by id needs these headers, not just the
 * ones under `files.*`.
 */
export function callerHeaders(
  caller: FileCallerAssertion
): Record<string, string> {
  return {
    'x-876-source-app-id': caller.sourceAppId,
    ...(caller.actorUserId
      ? { 'x-876-actor-user-id': caller.actorUserId }
      : {}),
    ...(caller.actorOrgId ? { 'x-876-actor-org-id': caller.actorOrgId } : {}),
  }
}
