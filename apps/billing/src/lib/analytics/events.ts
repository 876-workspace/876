export const BillingAnalyticsEvent = {
  PageViewed: '$pageview',
  PageViewedDetailed: 'page_viewed',
  UnhandledException: 'error_unhandled_exception',
  UnhandledRejection: 'error_unhandled_rejection',
} as const

export type BillingAnalyticsEventName =
  (typeof BillingAnalyticsEvent)[keyof typeof BillingAnalyticsEvent]
