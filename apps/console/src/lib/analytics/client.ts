'use client'

import { createAuditEventMirror, createBrowserAnalytics } from '@876/analytics'

import { AnalyticsEvent } from './events'
import { request } from '@/lib/client/request'
import type { AnalyticsEventName } from '@/types/analytics'

const mirrorAuditEvent = createAuditEventMirror<AnalyticsEventName>({
  appName: 'console',
  enabled: true,
  events: [
    AnalyticsEvent.PageViewedDetailed,
    AnalyticsEvent.UnhandledException,
    AnalyticsEvent.UnhandledRejection,
  ],
  createEvent: (params) =>
    request('/api/audit-events', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  userIdProperty: 'viewer_user_id',
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
  appName: 'console',
  identifyStorageKey: '876.console.analytics.identified_user_id',
  events: {
    pageViewed: AnalyticsEvent.PageViewed,
    pageViewedDetailed: AnalyticsEvent.PageViewedDetailed,
    unhandledException: AnalyticsEvent.UnhandledException,
    unhandledRejection: AnalyticsEvent.UnhandledRejection,
  },
  onTrack: mirrorAuditEvent,
})
