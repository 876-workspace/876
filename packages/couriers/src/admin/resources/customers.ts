import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  customerListSchema,
  customerSchema,
  type CreateCustomerBody,
  type CreateMailboxBody,
  type Customer,
  type CustomerList,
  type ListCustomersParams,
  type UpdateCustomerBody,
  type UpdateMailboxBody,
} from '../types/customer.schema'
import {
  mailboxListSchema,
  mailboxSchema,
  type Mailbox,
  type MailboxList,
} from '../types/mailbox.schema'

export function createCustomersResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/customers`
  const mailboxPath = (tenantId: string, id: string) =>
    `${path(tenantId)}/${encodeURIComponent(id)}/mailboxes`

  return {
    list(tenantId: string, params: ListCustomersParams = {}) {
      return AdminRequest<CustomerList>(
        runtime,
        { method: 'GET', path: path(tenantId), query: params },
        customerListSchema
      )
    },

    retrieve(tenantId: string, id: string) {
      return AdminRequest<Customer>(
        runtime,
        { method: 'GET', path: `${path(tenantId)}/${encodeURIComponent(id)}` },
        customerSchema
      )
    },

    create(tenantId: string, body: CreateCustomerBody) {
      return AdminRequest<Customer>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        customerSchema
      )
    },

    update(tenantId: string, id: string, body: UpdateCustomerBody) {
      return AdminRequest<Customer>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        customerSchema
      )
    },

    mailboxes: {
      list(tenantId: string, customerId: string) {
        return AdminRequest<MailboxList>(
          runtime,
          { method: 'GET', path: mailboxPath(tenantId, customerId) },
          mailboxListSchema
        )
      },

      create(tenantId: string, customerId: string, body: CreateMailboxBody) {
        return AdminRequest<Mailbox>(
          runtime,
          { method: 'POST', path: mailboxPath(tenantId, customerId), body },
          mailboxSchema
        )
      },

      update(
        tenantId: string,
        customerId: string,
        mailboxId: string,
        body: UpdateMailboxBody
      ) {
        return AdminRequest<Mailbox>(
          runtime,
          {
            method: 'PATCH',
            path: `${mailboxPath(tenantId, customerId)}/${encodeURIComponent(mailboxId)}`,
            body,
          },
          mailboxSchema
        )
      },
    },
  }
}
