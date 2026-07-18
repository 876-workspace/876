import type { MemberUpdated, MemberUpdateInput } from '@/types/access'

import { request } from './request'

const update = (userId: string, params: MemberUpdateInput) =>
  request<MemberUpdated>(`/api/v1/members/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const members = { update }
