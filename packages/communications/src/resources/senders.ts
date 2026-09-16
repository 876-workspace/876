import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  createEmailSenderSchema,
  deletedEmailSenderSchema,
  emailSenderListSchema,
  emailSenderSchema,
  ensureManagedSenderSchema,
  updateEmailSenderSchema,
  type CreateEmailSenderInput,
  type EnsureManagedSenderInput,
  type RequestOptions,
  type UpdateEmailSenderInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/email/senders`
}

export function createSendersResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId),
          signal: options.signal,
        },
        emailSenderListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateEmailSenderInput,
      options: RequestOptions = {}
    ) {
      const parsed = createEmailSenderSchema.parse(input)
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: parsed,
          signal: options.signal,
        },
        emailSenderSchema
      )
    },
    /**
     * Provision the organization's free `managed` sender, or return the existing
     * one unchanged. Idempotent, and the from-address is derived server-side —
     * the caller cannot choose it.
     */
    ensureManaged(
      organizationId: string,
      input: EnsureManagedSenderInput,
      options: RequestOptions = {}
    ) {
      const parsed = ensureManagedSenderSchema.parse(input)
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/managed`,
          body: parsed,
          signal: options.signal,
        },
        emailSenderSchema
      )
    },
    retrieve(
      organizationId: string,
      senderId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(senderId)}`,
          signal: options.signal,
        },
        emailSenderSchema
      )
    },
    update(
      organizationId: string,
      senderId: string,
      input: UpdateEmailSenderInput,
      options: RequestOptions = {}
    ) {
      const parsed = updateEmailSenderSchema.parse(input)
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(senderId)}`,
          body: parsed,
          signal: options.signal,
        },
        emailSenderSchema
      )
    },
    delete(
      organizationId: string,
      senderId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(senderId)}`,
          signal: options.signal,
          headers: options.actorId
            ? { 'x-actor-id': options.actorId }
            : undefined,
        },
        deletedEmailSenderSchema
      )
    },
  }
}
