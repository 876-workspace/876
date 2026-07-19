import { v } from 'convex/values'

export const WIDGET_HOSTS = [
  'console',
  'billing',
  'couriers',
  'enterprise',
  '876',
] as const

export type WidgetHost = (typeof WIDGET_HOSTS)[number]

export const widgetHostValidator = v.union(
  v.literal('console'),
  v.literal('billing'),
  v.literal('couriers'),
  v.literal('enterprise'),
  v.literal('876')
)

export function isWidgetHost(value: string): value is WidgetHost {
  return (WIDGET_HOSTS as readonly string[]).includes(value)
}

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number]

export const articleStatusValidator = v.union(
  v.literal('draft'),
  v.literal('published'),
  v.literal('archived')
)

export const ARTICLE_AUDIENCES = [
  'end_user',
  'org_member',
  'platform_admin',
] as const
export type ArticleAudience = (typeof ARTICLE_AUDIENCES)[number]

export const articleAudienceValidator = v.union(
  v.literal('end_user'),
  v.literal('org_member'),
  v.literal('platform_admin')
)

/** Audiences the viewer may see at or below this ceiling. */
export function audiencesUpTo(
  max: ArticleAudience
): readonly ArticleAudience[] {
  if (max === 'end_user') return ['end_user']
  if (max === 'org_member') return ['end_user', 'org_member']
  return ARTICLE_AUDIENCES
}

export function hostsInclude(
  hosts: readonly string[],
  host: WidgetHost
): boolean {
  return hosts.includes(host)
}
