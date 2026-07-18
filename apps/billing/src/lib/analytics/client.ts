'use client'

import { createBrowserAnalytics } from '@876/analytics'

import { BillingAnalyticsEvent, type BillingAnalyticsEventName } from './events'

export const { AnalyticsIdentity, AnalyticsProvider, track } =
  createBrowserAnalytics<BillingAnalyticsEventName>({
    appName: 'billing',
    identifyStorageKey: '876.billing.analytics.identified_user_id',
    events: {
      pageViewed: BillingAnalyticsEvent.PageViewed,
      pageViewedDetailed: BillingAnalyticsEvent.PageViewedDetailed,
      unhandledException: BillingAnalyticsEvent.UnhandledException,
      unhandledRejection: BillingAnalyticsEvent.UnhandledRejection,
    },
  })
