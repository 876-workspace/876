import { AnalyticsEvent } from '@/lib/analytics/events'

export {
  analyticsErrorSchema,
  analyticsPropertyValueSchema,
  type AnalyticsError,
  type AnalyticsProperties,
  type AnalyticsPropertyValue,
  type AnalyticsRawProperties,
  type AnalyticsUser,
} from '@876/analytics'

export type AnalyticsContext = {
  source: 'client' | 'server'
  app_name: string
  app_version?: string
  app_environment?: string
  current_url?: string
  path?: string
  referrer?: string
  page_title?: string
  browser_language?: string
  timezone?: string
  request_id?: string
  session_id?: string
  anonymous_id?: string
}

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent]
