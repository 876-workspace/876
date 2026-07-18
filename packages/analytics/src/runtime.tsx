'use client'

import { Suspense, useEffect, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

import { sanitizeAnalyticsProperties } from './sanitize'
import type {
  AnalyticsError,
  AnalyticsProperties,
  AnalyticsRawProperties,
  AnalyticsUser,
} from './types'

export type BrowserAnalyticsEvents<TEvent extends string> = {
  pageViewed: TEvent
  pageViewedDetailed?: TEvent
  unhandledException: TEvent
  unhandledRejection: TEvent
}

export type BrowserAnalyticsConfig<TEvent extends string> = {
  appName: string
  identifyStorageKey: string
  events: BrowserAnalyticsEvents<TEvent>
  appVersion?: string | null
  appEnvironment?: string | null
  posthogKey?: string
  posthogHost?: string
  onTrack?: (event: TEvent, properties: AnalyticsProperties) => void
}

export type AnalyticsTrackOptions = {
  properties?: AnalyticsRawProperties
  user?: AnalyticsUser | null
  error?: AnalyticsError | Error | null
  identify?: boolean
}

export type AnalyticsGroup = {
  type: string
  key: string
  properties?: AnalyticsRawProperties
}

export type BrowserAnalytics<TEvent extends string> = {
  AnalyticsProvider: (props: {
    children: ReactNode
    user?: AnalyticsUser | null
    groups?: readonly AnalyticsGroup[]
  }) => ReactNode
  AnalyticsIdentity: (props: {
    user: AnalyticsUser | null
    groups?: readonly AnalyticsGroup[]
  }) => ReactNode
  initializeClientAnalytics: () => void
  identifyAnalyticsUser: (user: AnalyticsUser) => void
  resetAnalyticsIdentity: () => void
  track: (event: TEvent, options?: AnalyticsTrackOptions) => void
  usePageTracking: () => void
}

export function createBrowserAnalytics<TEvent extends string>(
  config: BrowserAnalyticsConfig<TEvent>
): BrowserAnalytics<TEvent> {
  let initialized = false
  let posthogInitialized = false

  function initializeClientAnalytics(): void {
    if (initialized || typeof window === 'undefined') return

    initialized = true
    initializePostHog()
    setupGlobalErrorTracking()
  }

  function initializePostHog(): void {
    if (posthogInitialized || typeof window === 'undefined') return

    const token = config.posthogKey ?? process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!token) return

    posthogInitialized = true
    posthog.init(token, {
      api_host:
        config.posthogHost ??
        process.env.NEXT_PUBLIC_POSTHOG_HOST ??
        'https://us.i.posthog.com',
      capture_pageview: false,
      loaded(client) {
        client.register(getSuperProperties())
      },
    })
  }

  function identifyAnalyticsUser(user: AnalyticsUser): void {
    initializeClientAnalytics()
    if (!posthogInitialized || typeof window === 'undefined') return

    const identifiedUserId = window.localStorage.getItem(
      config.identifyStorageKey
    )
    if (identifiedUserId !== user.id) {
      const anonymousId = posthog.get_distinct_id()
      if (anonymousId && anonymousId !== user.id)
        posthog.alias(user.id, anonymousId)

      window.localStorage.setItem(config.identifyStorageKey, user.id)
    }

    posthog.identify(user.id, getUserProfileProperties(user))
  }

  function resetAnalyticsIdentity(): void {
    if (typeof window === 'undefined') return

    const identifiedUserId = window.localStorage.getItem(
      config.identifyStorageKey
    )
    window.localStorage.removeItem(config.identifyStorageKey)

    if (identifiedUserId && posthogInitialized) posthog.reset()
  }

  function track(event: TEvent, options: AnalyticsTrackOptions = {}): void {
    initializeClientAnalytics()

    if (options.user && options.identify !== false)
      identifyAnalyticsUser(options.user)

    const properties = sanitizeAnalyticsProperties({
      ...getClientAnalyticsContext(),
      ...getErrorProperties(options.error),
      ...options.properties,
    })

    config.onTrack?.(event, properties)

    if (!posthogInitialized) return
    posthog.capture(event, properties)
  }

  function identifyAnalyticsGroups(groups: readonly AnalyticsGroup[]): void {
    initializeClientAnalytics()
    if (!posthogInitialized || typeof window === 'undefined') return

    for (const group of groups)
      posthog.group(
        group.type,
        group.key,
        sanitizeAnalyticsProperties(group.properties)
      )
  }

  function AnalyticsIdentity({
    user,
    groups = [],
  }: {
    user: AnalyticsUser | null
    groups?: readonly AnalyticsGroup[]
  }) {
    useEffect(() => {
      if (!user) {
        resetAnalyticsIdentity()
        return
      }

      identifyAnalyticsUser(user)
      identifyAnalyticsGroups(groups)
    }, [groups, user])

    return null
  }

  function AnalyticsProvider({
    children,
    user,
    groups = [],
  }: {
    children: ReactNode
    user?: AnalyticsUser | null
    groups?: readonly AnalyticsGroup[]
  }) {
    useEffect(() => {
      initializeClientAnalytics()
    }, [])

    return (
      <>
        {children}
        <Suspense fallback={null}>
          <PageTracking />
        </Suspense>
        {user !== undefined ? (
          <AnalyticsIdentity user={user} groups={groups} />
        ) : null}
      </>
    )
  }

  function PageTracking() {
    usePageTracking()
    return null
  }

  function usePageTracking(): void {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
      const search = searchParams.toString()
      const properties = {
        path: pathname,
        search: search ? `?${search}` : null,
        referrer: document.referrer || null,
        title: document.title || null,
      }

      track(config.events.pageViewed, { properties })
      if (config.events.pageViewedDetailed)
        track(config.events.pageViewedDetailed, { properties })
    }, [pathname, searchParams])
  }

  function setupGlobalErrorTracking(): void {
    window.addEventListener('error', (event) => {
      track(config.events.unhandledException, {
        error: event.error instanceof Error ? event.error : null,
        properties: {
          error_message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      track(config.events.unhandledRejection, {
        error: event.reason instanceof Error ? event.reason : null,
        properties: {
          reason: String(event.reason),
        },
      })
    })
  }

  function getClientAnalyticsContext(): AnalyticsProperties {
    if (typeof window === 'undefined') {
      return {
        source: 'client',
        app_name: config.appName,
        app_environment: getAppEnvironment(),
      }
    }

    return {
      ...getSuperProperties(),
      source: 'client',
      current_url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || null,
      page_title: document.title || null,
      browser_language: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    }
  }

  function getSuperProperties(): AnalyticsProperties {
    return {
      app_name: config.appName,
      app_version:
        config.appVersion ?? process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      app_environment: getAppEnvironment(),
    }
  }

  function getAppEnvironment(): string {
    return (
      config.appEnvironment ??
      process.env.NEXT_PUBLIC_APP_ENVIRONMENT ??
      process.env.NODE_ENV ??
      'development'
    )
  }

  return {
    AnalyticsProvider,
    AnalyticsIdentity,
    initializeClientAnalytics,
    identifyAnalyticsUser,
    resetAnalyticsIdentity,
    track,
    usePageTracking,
  }
}

function getErrorProperties(
  error?: AnalyticsError | Error | null
): AnalyticsRawProperties {
  if (!error) return {}

  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
    }
  }

  return {
    error_code: error.code ?? null,
    error_message: error.message ?? error.description ?? null,
    status_code: error.httpStatus ?? null,
  }
}

function getUserProfileProperties(user: AnalyticsUser) {
  const fullName =
    user.name ??
    [user.firstName, user.lastName].filter(Boolean).join(' ') ??
    undefined

  return {
    user_id: user.id,
    name: fullName || undefined,
    full_name: fullName || undefined,
    email: user.email ?? undefined,
    first_name: user.firstName ?? undefined,
    last_name: user.lastName ?? undefined,
    username: user.username ?? undefined,
    avatar: user.avatar ?? undefined,
    avatar_url: user.avatar ?? undefined,
    status: user.status ?? undefined,
    email_verified: user.emailVerified ?? undefined,
    profile_synced_at: new Date().toISOString(),
  }
}
