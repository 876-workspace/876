import { create } from './create'
import { deleteTransaction } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const bankTransactions = {
  create,
  list,
  retrieve,
  update,
  delete: deleteTransaction,
}
