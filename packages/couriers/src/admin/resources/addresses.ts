import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  addressListSchema,
  addressSchema,
  deletedAddressSchema,
  type Address,
  type AddressList,
  type CreateAddressBody,
  type DeletedAddress,
  type ListAddressesParams,
  type UpdateAddressBody,
} from '../types/address.schema'

export function createAddressesResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/addresses`

  return {
    list(tenantId: string, params: ListAddressesParams = {}) {
      return AdminRequest<AddressList>(
        runtime,
        { method: 'GET', path: path(tenantId), query: params },
        addressListSchema
      )
    },

    retrieve(tenantId: string, id: string) {
      return AdminRequest<Address>(
        runtime,
        { method: 'GET', path: `${path(tenantId)}/${encodeURIComponent(id)}` },
        addressSchema
      )
    },

    create(tenantId: string, body: CreateAddressBody) {
      return AdminRequest<Address>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        addressSchema
      )
    },

    update(tenantId: string, id: string, body: UpdateAddressBody) {
      return AdminRequest<Address>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        addressSchema
      )
    },

    del(tenantId: string, id: string) {
      return AdminRequest<DeletedAddress>(
        runtime,
        {
          method: 'DELETE',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
        },
        deletedAddressSchema
      )
    },
  }
}
