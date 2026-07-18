'use client'

import { createAuditEventMirror, createBrowserAnalytics } from '@876/analytics'
import { create876Client } from '@876/sdk'

import { CONSUMER_APP_SLUG } from '@/lib/consumer-app'

import { AnalyticsEvent, type AnalyticsEventName } from './events'

const apiKey = resolvePublicApiKey()
const auditClient = create876Client({
  apiKey,
  credentials: 'include',
})
const mirrorAuditEvent = createAuditEventMirror<AnalyticsEventName>({
  appName: CONSUMER_APP_SLUG,
  enabled: Boolean(apiKey),
  events: [
    AnalyticsEvent.PageViewedDetailed,
    AnalyticsEvent.UnhandledException,
    AnalyticsEvent.UnhandledRejection,
  ],
  createEvent: (params) => auditClient.auditEvents.create(params),
})

export const {
  AnalyticsIdentity,
  AnalyticsProvider,
  identifyAnalyticsUser,
  initializeClientAnalytics,
  resetAnalyticsIdentity,
  track,
  usePageTracking,
} = createBrowserAnalytics<AnalyticsEventName>({
  appName: CONSUMER_APP_SLUG,
  identifyStorageKey: '876.analytics.identified_user_id',
  events: {
    pageViewed: AnalyticsEvent.PageViewed,
    pageViewedDetailed: AnalyticsEvent.PageViewedDetailed,
    unhandledException: AnalyticsEvent.UnhandledException,
    unhandledRejection: AnalyticsEvent.UnhandledRejection,
  },
  onTrack: mirrorAuditEvent,
})

function resolvePublicApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_876_API_KEY
  return key?.startsWith('876_app_secret_') ? key : undefined
}
