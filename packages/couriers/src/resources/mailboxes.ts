import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  mailboxListSchema,
  type MailboxList,
} from '../admin/types/mailbox.schema'

export function createMailboxesResource(runtime: Runtime) {
  const path = '/v1/me/mailboxes'
  return {
    list(params: Record<string, unknown> = {}) {
      return SessionRequest<MailboxList>(
        runtime,
        { method: 'GET', path, query: params as never },
        mailboxListSchema
      )
    },
  }
}
