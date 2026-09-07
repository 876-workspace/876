import { create } from './create'
import { deleteInvoice } from './delete'
import { list } from './list'
import { markOverdue } from './mark-overdue'
import { retrieve } from './retrieve'
import { update } from './update'

export const invoices = {
  create,
  list,
  retrieve,
  update,
  markOverdue,
  delete: deleteInvoice,
}
