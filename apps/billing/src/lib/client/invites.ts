import type { InviteCreateInput, InviteView } from '@/types/access'

import { request } from './request'

type InviteListView = {
  object: 'list'
  data: InviteView[]
}

const list = () => request<InviteListView>('/api/team/invites')

const create = (params: InviteCreateInput) =>
  request<InviteView>('/api/team/invites', {
    method: 'POST',
    body: JSON.stringify(params),
  })

const revoke = (inviteId: string) =>
  request<InviteView>(`/api/team/invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
  })

export const invites = { list, create, revoke }
