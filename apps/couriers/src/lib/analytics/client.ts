'use client'

import { createBrowserAnalytics } from '@876/analytics'

import {
  CouriersAnalyticsEvent,
  type CouriersAnalyticsEventName,
} from './events'

export const { AnalyticsIdentity, AnalyticsProvider, track } =
  createBrowserAnalytics<CouriersAnalyticsEventName>({
    appName: 'couriers',
    identifyStorageKey: '876.couriers.analytics.identified_user_id',
    events: {
      pageViewed: CouriersAnalyticsEvent.PageViewed,
      pageViewedDetailed: CouriersAnalyticsEvent.PageViewedDetailed,
      unhandledException: CouriersAnalyticsEvent.UnhandledException,
      unhandledRejection: CouriersAnalyticsEvent.UnhandledRejection,
    },
  })
