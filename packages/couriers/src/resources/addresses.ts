import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  addressListSchema,
  addressSchema,
  deletedAddressSchema,
  type Address,
  type AddressList,
  type CreateAddressBody,
  type DeletedAddress,
  type UpdateAddressBody,
} from '../admin/types/address.schema'

export function createAddressesResource(runtime: Runtime) {
  const path = '/v1/me/addresses'
  return {
    list(params: Record<string, unknown> = {}) {
      return SessionRequest<AddressList>(runtime, { method: 'GET', path, query: params as never }, addressListSchema)
    },
    retrieve(id: string) {
      return SessionRequest<Address>(runtime, { method: 'GET', path: `${path}/${encodeURIComponent(id)}` }, addressSchema)
    },
    create(body: CreateAddressBody) {
      return SessionRequest<Address>(runtime, { method: 'POST', path, body }, addressSchema)
    },
    update(id: string, body: UpdateAddressBody) {
      return SessionRequest<Address>(runtime, { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body }, addressSchema)
    },
    delete(id: string) {
      return SessionRequest<DeletedAddress>(runtime, { method: 'DELETE', path: `${path}/${encodeURIComponent(id)}` }, deletedAddressSchema)
    },
  }
}
