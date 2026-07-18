'use client'

import { createAuditEventMirror, createBrowserAnalytics } from '@876/analytics'
import { create876Client } from '@876/sdk'

import {
  EnterpriseAnalyticsEvent,
  type EnterpriseAnalyticsEventName,
} from './events'
import { ENTERPRISE_APP_SLUG } from '@/lib/enterprise-app'

const apiKey = resolvePublicApiKey()
const auditClient = create876Client({
  apiKey,
  credentials: 'include',
})
const mirrorAuditEvent = createAuditEventMirror<EnterpriseAnalyticsEventName>({
  appName: ENTERPRISE_APP_SLUG,
  enabled: Boolean(apiKey),
  events: [
    EnterpriseAnalyticsEvent.PageViewedDetailed,
    EnterpriseAnalyticsEvent.UnhandledException,
    EnterpriseAnalyticsEvent.UnhandledRejection,
  ],
  createEvent: (params) => auditClient.auditEvents.create(params),
})

export const { AnalyticsIdentity, AnalyticsProvider, track } =
  createBrowserAnalytics<EnterpriseAnalyticsEventName>({
    appName: ENTERPRISE_APP_SLUG,
    identifyStorageKey: '876.enterprise.analytics.identified_user_id',
    events: {
      pageViewed: EnterpriseAnalyticsEvent.PageViewed,
      pageViewedDetailed: EnterpriseAnalyticsEvent.PageViewedDetailed,
      unhandledException: EnterpriseAnalyticsEvent.UnhandledException,
      unhandledRejection: EnterpriseAnalyticsEvent.UnhandledRejection,
    },
    onTrack: mirrorAuditEvent,
  })

function resolvePublicApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_876_API_KEY
  return key?.startsWith('876_app_secret_') ? key : undefined
}
