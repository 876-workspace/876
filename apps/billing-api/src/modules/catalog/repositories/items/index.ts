import { adjustStock } from './adjust-stock'
import { create } from './create'
import { deleteItem } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'
import { variants } from './variants'

export const items = {
  create,
  retrieve,
  list,
  update,
  adjustStock,
  variants,
  delete: deleteItem,
}
