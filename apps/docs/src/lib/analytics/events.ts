export const DocsAnalyticsEvent = {
  PageViewed: '$pageview',
  PageViewedDetailed: 'page_viewed',
  UnhandledException: 'error_unhandled_exception',
  UnhandledRejection: 'error_unhandled_rejection',
} as const

export type DocsAnalyticsEventName =
  (typeof DocsAnalyticsEvent)[keyof typeof DocsAnalyticsEvent]
