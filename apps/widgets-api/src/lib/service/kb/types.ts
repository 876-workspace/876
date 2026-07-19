export type KbHost = 'console' | 'billing' | 'couriers' | 'enterprise' | '876'

export type KbStatus = 'draft' | 'published' | 'archived'
export type KbAudience = 'end_user' | 'org_member' | 'platform_admin'

export type KbCategoryResource = {
  object: 'kb_category'
  id: string
  slug: string
  name: string
  description: string | null
  parent_id: string | null
  sort_order: number
  hosts: string[]
  created_at: number
  updated_at: number
}

export type KbArticleResource = {
  object: 'kb_article'
  id: string
  slug: string
  title: string
  summary: string | null
  body: string
  category_id: string | null
  status: KbStatus
  audience: KbAudience
  hosts: string[]
  featured: boolean
  author_user_id: string
  published_at: number | null
  created_at: number
  updated_at: number
}

export type KbArticleList = {
  object: 'list'
  data: KbArticleResource[]
  has_more: boolean
  url: string
  total_count: number | null
  continue_cursor?: string
}

export type KbCategoryList = {
  object: 'list'
  data: KbCategoryResource[]
  has_more: boolean
  url: string
  total_count: number | null
}

export type KbBookmarkResource = {
  object: 'kb_bookmark'
  id: string
  article_id: string
  owner_account_id: string
  created_at: number
  article?: {
    object: 'kb_article'
    id: string
    slug: string
    title: string
    summary: string | null
    category_id: string | null
    status: KbStatus
    audience: KbAudience
    hosts: string[]
    featured: boolean
    updated_at: number
  }
}

export type KbBookmarkList = {
  object: 'list'
  data: KbBookmarkResource[]
  has_more: boolean
  url: string
  total_count: number | null
}

export type DeletedKbArticle = {
  object: 'kb_article'
  id: string
  deleted: true
}

export type DeletedKbCategory = {
  object: 'kb_category'
  id: string
  deleted: true
}

export const KB_HOSTS: readonly KbHost[] = [
  'console',
  'billing',
  'couriers',
  'enterprise',
  '876',
]

export function isKbHost(value: string): value is KbHost {
  return (KB_HOSTS as readonly string[]).includes(value)
}

export function isKbStatus(value: string): value is KbStatus {
  return value === 'draft' || value === 'published' || value === 'archived'
}

export function isKbAudience(value: string): value is KbAudience {
  return (
    value === 'end_user' || value === 'org_member' || value === 'platform_admin'
  )
}
