import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  customerListSchema,
  customerEnrollmentSchema,
  customerSchema,
  deletedCustomerSchema,
  type CreateCustomerBody,
  type CreateMailboxBody,
  type Customer,
  type CustomerEnrollment,
  type CustomerEnrollmentBody,
  type CustomerList,
  type DeleteCustomerBody,
  type DeletedCustomer,
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
import {
  customerAddressListSchema,
  customerAddressSchema,
  deletedCustomerAddressSchema,
  type CreateCustomerAddressBody,
  type CustomerAddress,
  type CustomerAddressList,
  type DeletedCustomerAddress,
  type ListCustomerAddressesParams,
  type UpdateCustomerAddressBody,
} from '../types/customer-address.schema'

export function createCustomersResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/customers`
  const mailboxPath = (tenantId: string, id: string) =>
    `${path(tenantId)}/${encodeURIComponent(id)}/mailboxes`
  const customerAddressPath = (tenantId: string, customerId: string) =>
    `${path(tenantId)}/${encodeURIComponent(customerId)}/addresses`

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

    enroll(tenantId: string, body: CustomerEnrollmentBody) {
      return AdminRequest<CustomerEnrollment>(
        runtime,
        {
          method: 'POST',
          path: `${path(tenantId)}/enrollments`,
          body,
        },
        customerEnrollmentSchema
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

    delete(tenantId: string, id: string, body?: DeleteCustomerBody) {
      return AdminRequest<DeletedCustomer>(
        runtime,
        {
          method: 'DELETE',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          ...(body === undefined ? {} : { body }),
        },
        deletedCustomerSchema
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

    addresses: {
      list(
        tenantId: string,
        customerId: string,
        params: ListCustomerAddressesParams = {}
      ) {
        return AdminRequest<CustomerAddressList>(
          runtime,
          {
            method: 'GET',
            path: customerAddressPath(tenantId, customerId),
            query: params,
          },
          customerAddressListSchema
        )
      },

      retrieve(tenantId: string, customerId: string, id: string) {
        return AdminRequest<CustomerAddress>(
          runtime,
          {
            method: 'GET',
            path: `${customerAddressPath(tenantId, customerId)}/${encodeURIComponent(id)}`,
          },
          customerAddressSchema
        )
      },

      create(
        tenantId: string,
        customerId: string,
        body: CreateCustomerAddressBody
      ) {
        return AdminRequest<CustomerAddress>(
          runtime,
          {
            method: 'POST',
            path: customerAddressPath(tenantId, customerId),
            body,
          },
          customerAddressSchema
        )
      },

      update(
        tenantId: string,
        customerId: string,
        id: string,
        body: UpdateCustomerAddressBody
      ) {
        return AdminRequest<CustomerAddress>(
          runtime,
          {
            method: 'PATCH',
            path: `${customerAddressPath(tenantId, customerId)}/${encodeURIComponent(id)}`,
            body,
          },
          customerAddressSchema
        )
      },

      delete(tenantId: string, customerId: string, id: string) {
        return AdminRequest<DeletedCustomerAddress>(
          runtime,
          {
            method: 'DELETE',
            path: `${customerAddressPath(tenantId, customerId)}/${encodeURIComponent(id)}`,
          },
          deletedCustomerAddressSchema
        )
      },
    },
  }
}
