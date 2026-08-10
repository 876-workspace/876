export { createAddressesRouter } from './addresses.routes'
export {
  addressCreateBodySchema,
  addressSchema,
  addressUpdateBodySchema,
  type Address,
  type AddressCreateBody,
  type AddressUpdateBody,
} from './addresses.schemas'
export { serializeAddress, type AddressRow } from './addresses.serializers'
export {
  buildAddressCreateData,
  buildAddressUpdateData,
  deleteAddressIfUnused,
} from './addresses.service'
export type { AddressCreateData, AddressUpdateData } from './addresses.service'
