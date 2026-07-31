import { create } from './create'
import { del } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const customerAddresses = {
  create,
  delete: del,
  list,
  retrieve,
  update,
}
