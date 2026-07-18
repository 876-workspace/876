export const CouriersAnalyticsEvent = {
  PageViewed: '$pageview',
  PageViewedDetailed: 'page_viewed',
  UnhandledException: 'error_unhandled_exception',
  UnhandledRejection: 'error_unhandled_rejection',
} as const

export type CouriersAnalyticsEventName =
  (typeof CouriersAnalyticsEvent)[keyof typeof CouriersAnalyticsEvent]
