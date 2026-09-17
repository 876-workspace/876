import 'server-only'

import { apiJson } from '@876/core/api'
import type { ListIssuesQuery } from '@876/projects/contracts'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

/** One page of matches: a picker is narrowed by typing, never paged. */
const SEARCH_LIMIT = 25

const searchIssuesSchema = z.strictObject({
  q: z.string().trim().min(1),
  projectId: z.string().trim().min(1).optional(),
})

/**
 * Searches work items for the relationship and dependency pickers.
 *
 * The pickers used to hold a preloaded window of the tenant, which is why a
 * work item outside that window could not be linked at all. The search runs
 * here, against the owning list verb, so the query — not the window — decides
 * what the picker can reach. The body carries the query rather than the URL so
 * a search is never a cached or prefetched GET.
 */
export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.view',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = searchIssuesSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a search query.' }, { status: 422 })

  const query: ListIssuesQuery = { q: parsed.data.q, limit: SEARCH_LIMIT }
  if (parsed.data.projectId) query.project = parsed.data.projectId

  const result = await projects.issues.list(auth.orgId, query)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Work items could not be searched.' },
      { status: 400 }
    )

  return apiJson({ data: result.data.data })
}
