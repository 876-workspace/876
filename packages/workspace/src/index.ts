/**
 * Type-only root. Runtime clients are imported from their authority entrypoint —
 * `@876/workspace/session` or `@876/workspace/operator` — so a server-only
 * operator client is never pulled into a browser bundle by a barrel import.
 */
export type {
  WorkspaceSessionClient,
  WorkspaceSessionClientOptions,
} from './session'
export type {
  WorkspaceOperatorClient,
  WorkspaceOperatorClientOptions,
} from './operator'
