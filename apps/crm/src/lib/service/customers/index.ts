import { create } from './create'
import { remove as deleteCustomer } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const customers = {
  create,
  retrieve,
  list,
  update,
  delete: deleteCustomer,
}
