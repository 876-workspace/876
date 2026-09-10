export type WorkSyncResourceType = 'TASK' | 'TASK_LIST' | 'CALENDAR' | 'EVENT'

export type WorkRemoteCalendar = {
  remoteId: string
  name: string
  description?: string | null
  timeZone?: string | null
  color?: string | null
  readOnly: boolean
}

export type WorkRemoteEvent = {
  remoteId: string
  etag?: string | null
  iCalUid?: string | null
  title: string
  description?: string | null
  location?: string | null
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  busyStatus: 'BUSY' | 'FREE'
  allDay: boolean
  startAt?: number | null
  endAt?: number | null
  timeZone?: string | null
  startDate?: string | null
  endDate?: string | null
  updatedAt?: number | null
  deleted?: boolean
}

export type WorkRemoteChange = {
  resourceType: WorkSyncResourceType
  remoteId: string
  etag?: string | null
  iCalUid?: string | null
  deleted?: boolean
  payload: unknown
}

export type WorkPullInput = {
  remoteCalendarId: string
  cursor?: string | null
  windowStart?: number | null
  windowEnd?: number | null
}

export type WorkPullResult = {
  changes: WorkRemoteChange[]
  cursor: string | null
  windowStart?: number | null
  windowEnd?: number | null
}

export type WorkPushResult = {
  remoteId: string
  etag?: string | null
  iCalUid?: string | null
}

export type WorkSyncCredential = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
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
 * Provider-neutral adapter contract. Provider implementations stay behind this
 * boundary so Work resources and widget consumers never learn provider HTTP
 * details, tokens, or collection cursor formats.
 */
export interface WorkSyncProviderAdapter {
  readonly provider: 'GOOGLE' | 'MICROSOFT' | 'CALDAV'

  calendars(): Promise<WorkRemoteCalendar[]>

  pull(input: WorkPullInput): Promise<WorkPullResult>

  push(resource: {
    type: WorkSyncResourceType
    remoteCalendarId: string
    localId: string
    remoteId?: string | null
    etag?: string | null
    payload: unknown
  }): Promise<WorkPushResult>

  remove(resource: {
    type: WorkSyncResourceType
    remoteCalendarId: string
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
      | 'credential-unavailable'
      | 'provider-unauthorized'
      | 'provider-rate-limited'
      | 'provider-unavailable'
      | 'provider-invalid-response'
      | 'provider-cursor-invalid'
      | 'provider-not-configured'
      | 'resource-unsupported',
    message: string,
    readonly retryAfterSeconds: number | null = null
  ) {
    super(message)
    this.name = 'WorkSyncProviderError'
  }
}
