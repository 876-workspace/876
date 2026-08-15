import { create } from './create'
import { deleteEstimate } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const estimates = {
  create,
  list,
  retrieve,
  update,
  delete: deleteEstimate,
}
