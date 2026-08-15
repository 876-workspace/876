import { create } from './create'
import { deleteMode } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const paymentModes = {
  create,
  list,
  retrieve,
  update,
  delete: deleteMode,
}
