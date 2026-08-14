import { create } from './create'
import { deletePriceList } from './delete'
import { list } from './list'
import { resolveAmount } from './resolve'
import { retrieve } from './retrieve'
import { update } from './update'

export const priceLists = {
  create,
  list,
  retrieve,
  update,
  delete: deletePriceList,
  resolveAmount,
}
