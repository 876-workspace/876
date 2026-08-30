export type WorkSyncResourceType = 'TASK' | 'TASK_LIST' | 'CALENDAR' | 'EVENT'

export type WorkRemoteChange = {
  resourceType: WorkSyncResourceType
  remoteId: string
  etag?: string | null
  iCalUid?: string | null
  deleted?: boolean
  payload: unknown
}

export type WorkPushResult = {
  remoteId: string
  etag?: string | null
  iCalUid?: string | null
}

export type WorkSyncCredential = {
  accessToken?: string
  username?: string
  password?: string
}

/**
 * Work persists only an opaque credential reference. The owning deployment may
 * resolve it through Vault, KMS, or another approved secret broker without
 * changing Work's business schema.
 */
export interface WorkSyncCredentialResolver {
  resolve(credentialRef: string): Promise<WorkSyncCredential | null>
}

/**
 * Provider-neutral adapter contract. Phase 2 intentionally defines this seam
 * without implementing Google, Microsoft, or CalDAV network behavior.
 */
export interface WorkSyncProviderAdapter {
  readonly provider: 'GOOGLE' | 'MICROSOFT' | 'CALDAV'

  pull(cursor?: string | null): Promise<{
    changes: WorkRemoteChange[]
    cursor: string | null
  }>

  push(resource: {
    type: WorkSyncResourceType
    localId: string
    remoteId?: string | null
    etag?: string | null
    payload: unknown
  }): Promise<WorkPushResult>

  remove(resource: {
    type: WorkSyncResourceType
    remoteId: string
    etag?: string | null
  }): Promise<void>
}

export type WorkSyncProviderFactory = (input: {
  provider: WorkSyncProviderAdapter['provider']
  credential: WorkSyncCredential
  remoteAccountId?: string | null
  caldavUrl?: string | null
}) => WorkSyncProviderAdapter

export class WorkSyncProviderError extends Error {
  constructor(
    readonly code:
      | 'credential_unavailable'
      | 'provider_unauthorized'
      | 'provider_rate_limited'
      | 'provider_unavailable'
      | 'provider_invalid_response'
      | 'resource_unsupported'
      | 'provider_not_implemented',
    message: string
  ) {
    super(message)
    this.name = 'WorkSyncProviderError'
  }
}
