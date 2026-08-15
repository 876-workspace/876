import { create } from './create'
import { deletePrice } from './delete'
import { ensure } from './ensure'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const prices = {
  create,
  retrieve,
  list,
  update,
  delete: deletePrice,
  ensure,
}
