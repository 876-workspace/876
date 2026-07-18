import type {
  AnalyticsError,
  AnalyticsEventName,
  AnalyticsEventPropertiesFor,
  AnalyticsProperties,
  AnalyticsRawProperties,
  AnalyticsUser,
} from './analytics'

/** Alias for sanitized analytics event properties. */
export type SanitizedAnalyticsProperties = AnalyticsProperties

/** Automatic context data attached to every analytics event. */
export type AnalyticsContext = {
  /** Source of the analytics event. */
  source: 'client' | 'server'
  /** Application name. */
  app_name: string
  /** Application version, if available. */
  app_version: string | null
  /** Deployment environment. */
  app_environment: string
  /** Full URL of the current page. */
  current_url: string | null
  /** Path of the current page. */
  path: string | null
  /** Query string of the current page. */
  search: string | null
  /** Hash fragment of the current page. */
  hash: string | null
  /** Referring URL. */
  referrer: string | null
  /** Page title. */
  page_title: string | null
  /** Browser language preference. */
  browser_language: string | null
  /** IANA timezone of the browser. */
  timezone: string | null
  /** User agent string. */
  user_agent: string | null
  /** Viewport width in pixels. */
  viewport_width: number | null
  /** Viewport height in pixels. */
  viewport_height: number | null
  /** Screen width in pixels. */
  screen_width: number | null
  /** Screen height in pixels. */
  screen_height: number | null
  /** Server-side request identifier. */
  request_id: string | null
  /** Session identifier. */
  session_id: string | null
  /** Anonymous identifier for unauthenticated users. */
  anonymous_id: string | null
}

/** Options for tracking an analytics event. */
export type AnalyticsTrackOptions<TProperties = AnalyticsRawProperties> = {
  /** User data to attach to the event. */
  user?: AnalyticsUser | null
  /** Error data to attach to the event. */
  error?: AnalyticsError | Error | null
  /** Custom event properties. */
  properties?: TProperties
  /** Context overrides for this event. */
  context?: Partial<AnalyticsContext>
  /** Request object for server-side events. */
  request?: Request
  /** Whether to identify the user after tracking. */
  identify?: boolean
}

/** Payload sent to analytics providers for tracking. */
export type AnalyticsPayload = {
  /** Name of the event to track. */
  event: AnalyticsEventName
  /** Distinct identifier for the tracked user. */
  distinctId?: string | null
  /** Sanitized event properties. */
  properties: SanitizedAnalyticsProperties
}

/** Parameters for identifying a user with analytics providers. */
export type IdentifyAnalyticsUserParams = {
  /** Unique identifier for the user. */
  userId: string
  /** Properties to set on the user profile. */
  properties: SanitizedAnalyticsProperties
  /** Properties to set only once on the user profile. */
  setOnceProperties?: SanitizedAnalyticsProperties
}

/** Parameters for setting analytics person profile properties. */
export type SetPersonPropertiesParams = {
  /** Distinct identifier for server-side person updates. */
  distinctId?: string
  /** Properties to set on the person profile. */
  properties: SanitizedAnalyticsProperties
  /** Properties to set only once on the person profile. */
  setOnceProperties?: SanitizedAnalyticsProperties
  /** Whether to update PostHog's last_seen_at value. */
  updateLastSeen?: boolean
}

/** Parameters for removing analytics person profile properties. */
export type UnsetPersonPropertiesParams = {
  /** Distinct identifier for server-side person updates. */
  distinctId?: string
  /** Person property keys to remove. */
  keys: string[]
  /** Whether to update PostHog's last_seen_at value. */
  updateLastSeen?: boolean
}

/** Parameters for linking analytics identities. */
export type AliasAnalyticsUserParams = {
  /** Canonical distinct identifier to merge into. */
  distinctId?: string
  /** Additional distinct identifier to link to the canonical user. */
  alias: string
}

/** Parameters for tracking a server-side analytics event. */
export type TrackServerAnalyticsEventParams = AnalyticsPayload & {
  distinctId: string
}

/** Client-side analytics provider contract. */
export interface AnalyticsProvider {
  /** Unique name of the provider. */
  name: string
  /** Optional initialization hook. */
  initialize?: () => void | Promise<void>
  /** Track an analytics event. */
  track: (payload: AnalyticsPayload) => void | Promise<void>
  /** Identify a user with the provider. */
  identify?: (params: IdentifyAnalyticsUserParams) => void | Promise<void>
  /** Set person profile properties with the provider. */
  setPersonProperties?: (
    params: SetPersonPropertiesParams
  ) => void | Promise<void>
  /** Remove person profile properties with the provider. */
  unsetPersonProperties?: (
    params: UnsetPersonPropertiesParams
  ) => void | Promise<void>
  /** Link two analytics identities with the provider. */
  alias?: (params: AliasAnalyticsUserParams) => void | Promise<void>
  /** Register super properties on the provider. */
  register?: (properties: SanitizedAnalyticsProperties) => void | Promise<void>
  /** Reset the provider state. */
  reset?: () => void | Promise<void>
}

/** Server-side analytics provider contract. */
export interface ServerAnalyticsProvider extends Omit<
  AnalyticsProvider,
  'track'
> {
  /** Track a server-side analytics event with a guaranteed distinct ID. */
  track: (payload: TrackServerAnalyticsEventParams) => void | Promise<void>
}

/** Resolves the property type for an analytics track call. */
export type AnalyticsTrackOptionsFor<TEvent extends AnalyticsEventName> =
  AnalyticsTrackOptions<AnalyticsEventPropertiesFor<TEvent>>
