import { apiJson } from '@876/core/api'
import { get876ServerClient } from '@/lib/876/server'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

/** Revokes a pending invite. Pure transport over `$876.invites.revoke`. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; inviteId: string }> }
): Promise<Response> {
  const { slug, inviteId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'members:invite')
  if (auth.response) return auth.response

  const client = await get876ServerClient()
  const { data, error } = await client.invites.revoke(
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
