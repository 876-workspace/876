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
            toNumber: params.toNumber,
            channel: params.channel,
            templateKey: params.templateKey,
            idempotencyKey: params.idempotencyKey,
            userId: params.userId,
            organizationId: params.organizationId,
            appId: params.appId,
            clientReference: params.clientReference,
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
            toNumber: params.toNumber,
            templateKey: params.templateKey,
            idempotencyKey: params.idempotencyKey,
            userId: params.userId,
            organizationId: params.organizationId,
            appId: params.appId,
            clientReference: params.clientReference,
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
            includeLineType: params.includeLineType,
          },
        })
      },
    },
  }
}
