import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { loadMemberLabels } from '@/features/projects/member-labels'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

/**
 * Searches organization members for the client-invite picker.
 *
 * Invites go to existing org members only, so this lists member labels
 * and filters server-side. Gated on `projects.edit` like the invite
 * itself: member emails must not leak to viewers.
 */
export async function GET(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const query =
    new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? ''
  if (query.length < 2)
    return apiJson(
      { error: 'Enter at least 2 characters to search.' },
      { status: 422 }
    )

  const members = await loadMemberLabels(auth.orgId)
  if (members.error)
    return apiJson(
      { error: members.error.message ?? 'Members could not be loaded.' },
      { status: 502 }
    )

  const matches = Object.entries(members.labels)
    .filter(([, label]) => label.toLowerCase().includes(query))
    .slice(0, 8)
    .map(([userId, label]) => ({ userId, label }))

  return apiJson({ data: matches })
}
