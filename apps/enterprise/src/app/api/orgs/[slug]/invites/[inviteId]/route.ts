import { apiJson } from '@876/core/api'
import { getAdminClient } from '@/lib/auth/admin-client'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

/** Revokes a pending invite. Pure transport over `$876.orgs.revokeInvite`. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; inviteId: string }> }
): Promise<Response> {
  const { slug, inviteId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'members:invite')
  if (auth.response) return auth.response

  const client = await getAdminClient()
  const { data, error } = await client.orgs.revokeInvite(
    auth.membership.organization.id,
    inviteId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to revoke the invite.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
