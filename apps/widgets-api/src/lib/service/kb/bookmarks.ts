import {
  kbFns,
  runKbMutation,
  runKbQuery,
  serviceAuth,
  type KbAudience,
  type KbHost,
} from '@/lib/kb/convex-client'
import type { KbBookmarkList, KbBookmarkResource } from './types'

export async function listBookmarks(params: {
  actorUserId: string
  host: KbHost
  maxAudience?: KbAudience
}) {
  const auth = serviceAuth(params.actorUserId)
  return runKbQuery<KbBookmarkList>('bookmarks.list', async (client) => {
    const page = await client.query(kbFns.bookmarks.list, {
      ...auth,
      host: params.host,
      maxAudience: params.maxAudience ?? 'org_member',
    })
    return {
      object: 'list',
      data: page.data ?? [],
      has_more: Boolean(page.has_more),
      url: '/v1/kb/bookmarks',
      total_count: page.total_count ?? null,
    }
  })
}

export async function createBookmark(params: {
  actorUserId: string
  articleId: string
  host: KbHost
  maxAudience?: KbAudience
}) {
  const auth = serviceAuth(params.actorUserId)
  return runKbMutation<KbBookmarkResource>('bookmarks.create', async (client) =>
    client.mutation(kbFns.bookmarks.create, {
      ...auth,
      articleId: params.articleId,
      host: params.host,
      maxAudience: params.maxAudience ?? 'org_member',
    })
  )
}

export async function deleteBookmark(params: {
  actorUserId: string
  articleId: string
}) {
  const auth = serviceAuth(params.actorUserId)
  return runKbMutation<{
    object: 'kb_bookmark'
    id: string | null
    article_id: string
    deleted: true
  }>('bookmarks.remove', async (client) =>
    client.mutation(kbFns.bookmarks.remove, {
      ...auth,
      articleId: params.articleId,
    })
  )
}
