import { createAddress } from './create'
import { retrieveAddress } from './retrieve'
import { updateAddress } from './update'
import { deleteAddress } from './delete'
import { listAddresses } from './list'
import { usageAddress } from './usage'

export const addresses = {
  create: createAddress,
  retrieve: retrieveAddress,
  update: updateAddress,
  delete: deleteAddress,
  list: listAddresses,
  usage: usageAddress,
}
