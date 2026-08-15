import { create } from './create'
import { apply } from './apply'
import { deletePayment } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const payments = {
  create,
  apply,
  list,
  retrieve,
  update,
  delete: deletePayment,
}
