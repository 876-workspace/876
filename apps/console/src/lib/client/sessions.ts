import { request } from './request'

type DeletedSession = { object: 'session'; id: string; deleted: true }

const revoke = (sessionId: string) =>
  request<DeletedSession>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  })

export const sessions = { revoke }
