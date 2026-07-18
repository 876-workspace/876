export const EnterpriseAnalyticsEvent = {
  PageViewed: '$pageview',
  PageViewedDetailed: 'page_viewed',
  UnhandledException: 'error_unhandled_exception',
  UnhandledRejection: 'error_unhandled_rejection',
} as const

export type EnterpriseAnalyticsEventName =
  (typeof EnterpriseAnalyticsEvent)[keyof typeof EnterpriseAnalyticsEvent]
