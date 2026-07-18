import { create } from './create'
import { deleteInvoice } from './delete'
import { list } from './list'
import { finalize } from './finalize'
import { markOverdue } from './mark-overdue'
import { retrieve } from './retrieve'
import { update } from './update'
import { voidInvoice } from './void'

export const invoices = {
  create,
  finalize,
  list,
  retrieve,
  update,
  void: voidInvoice,
  markOverdue,
  delete: deleteInvoice,
}
