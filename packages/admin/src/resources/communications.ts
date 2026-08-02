import { toCursorQuery } from '@876/core/client'

import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminCommunicationMessage,
  AdminCommunicationMessageCreateParams,
  AdminCommunicationCall,
  AdminCommunicationCallCreateParams,
  AdminCommunicationListParams,
  AdminListResponse,
  AdminPhoneLookup,
  AdminPhoneLookupCreateParams,
} from '../types'

/** `$876.messages.*`, `$876.calls.*`, and lookup operations — internal-key-only. */
export function createAdminCommunicationsResource(runtime: AdminRuntime) {
  return {
    messages: {
      create(params: AdminCommunicationMessageCreateParams) {
        return adminRequest<AdminCommunicationMessage>(runtime, {
          method: 'POST',
          path: '/communications/messages',
          body: {
            to_number: params.toNumber,
            channel: params.channel,
            template_key: params.templateKey,
            idempotency_key: params.idempotencyKey,
            user_id: params.userId,
            organization_id: params.organizationId,
            app_id: params.appId,
            client_reference: params.clientReference,
          },
        })
      },
      retrieve(messageId: string) {
        return adminRequest<AdminCommunicationMessage>(runtime, {
          method: 'GET',
          path: `/communications/messages/${messageId}`,
        })
      },
      list(params?: AdminCommunicationListParams) {
        return adminRequest<AdminListResponse<AdminCommunicationMessage>>(
          runtime,
          {
            method: 'GET',
            path: '/communications/messages',
            query: { ...toCursorQuery(params), status: params?.status },
          }
        )
      },
    },
    calls: {
      create(params: AdminCommunicationCallCreateParams) {
        return adminRequest<AdminCommunicationCall>(runtime, {
          method: 'POST',
          path: '/communications/calls',
          body: {
            to_number: params.toNumber,
            template_key: params.templateKey,
            idempotency_key: params.idempotencyKey,
            user_id: params.userId,
            organization_id: params.organizationId,
            app_id: params.appId,
            client_reference: params.clientReference,
          },
        })
      },
      retrieve(callId: string) {
        return adminRequest<AdminCommunicationCall>(runtime, {
          method: 'GET',
          path: `/communications/calls/${callId}`,
        })
      },
      list(params?: AdminCommunicationListParams) {
        return adminRequest<AdminListResponse<AdminCommunicationCall>>(
          runtime,
          {
            method: 'GET',
            path: '/communications/calls',
            query: { ...toCursorQuery(params), status: params?.status },
          }
        )
      },
    },
    phoneLookups: {
      create(params: AdminPhoneLookupCreateParams) {
        return adminRequest<AdminPhoneLookup>(runtime, {
          method: 'POST',
          path: '/communications/phone-lookups',
          body: {
            number: params.number,
            include_line_type: params.includeLineType,
          },
        })
      },
    },
  }
}
