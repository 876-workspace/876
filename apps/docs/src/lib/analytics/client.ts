'use client'

import { createAuditEventMirror, createBrowserAnalytics } from '@876/analytics'
import { create876Client } from '@876/sdk'

import { DocsAnalyticsEvent, type DocsAnalyticsEventName } from './events'

const apiKey = resolvePublicApiKey()
const auditClient = create876Client({
  apiKey,
  baseUrl:
    process.env.NEXT_PUBLIC_876_API_URL ?? process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
})
const mirrorAuditEvent = createAuditEventMirror<DocsAnalyticsEventName>({
  appName: '876-docs',
  enabled: Boolean(apiKey),
  events: [
    DocsAnalyticsEvent.PageViewedDetailed,
    DocsAnalyticsEvent.UnhandledException,
    DocsAnalyticsEvent.UnhandledRejection,
  ],
  createEvent: (params) => auditClient.auditEvents.create(params),
})

export const { AnalyticsProvider, track } =
  createBrowserAnalytics<DocsAnalyticsEventName>({
    appName: '876-docs',
    identifyStorageKey: '876.docs.analytics.identified_user_id',
    events: {
      pageViewed: DocsAnalyticsEvent.PageViewed,
      pageViewedDetailed: DocsAnalyticsEvent.PageViewedDetailed,
      unhandledException: DocsAnalyticsEvent.UnhandledException,
      unhandledRejection: DocsAnalyticsEvent.UnhandledRejection,
    },
    onTrack: mirrorAuditEvent,
  })

function resolvePublicApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_876_API_KEY
  return key?.startsWith('876_app_secret_') ? key : undefined
}
