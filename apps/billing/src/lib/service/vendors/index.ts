import { create } from './create'
import { deleteVendor } from './delete'
import { listVendors } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const vendors = {
  create,
  delete: deleteVendor,
  list: listVendors,
  listVendors,
  retrieve,
  update,
}
