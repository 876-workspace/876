import 'server-only'

import { cache } from 'react'

import { getWorkspace } from '@/lib/clients/workspace'

type MemberLabelResult = {
  labels: Readonly<Record<string, string>>
  error: { code: string; message: string } | null
}

export const loadMemberLabels = cache(
  async (orgId: string): Promise<MemberLabelResult> => {
    const workspace = await getWorkspace()
    const result = await workspace.members.list(orgId)
    if (result.error) return { labels: {}, error: result.error }

    const labels = Object.fromEntries(
      (result.data?.data ?? []).map((member) => {
        const name =
          [member.first_name, member.last_name].filter(Boolean).join(' ') ||
          member.email ||
          member.user_id

        return [member.user_id, name]
      })
    )

    return { labels, error: null }
  }
)
