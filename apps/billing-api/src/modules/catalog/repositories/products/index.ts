import { create } from './create'
import { deleteProduct } from './delete'
import { ensure } from './ensure'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const products = {
  create,
  retrieve,
  list,
  update,
  delete: deleteProduct,
  ensure,
}
