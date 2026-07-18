import { create } from './create'
import { deleteAccount } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const bankAccounts = {
  create,
  list,
  retrieve,
  update,
  delete: deleteAccount,
}
