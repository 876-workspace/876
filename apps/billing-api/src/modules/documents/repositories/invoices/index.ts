import { clone } from './clone'
import { create } from './create'
import { deleteInvoice } from './delete'
import { list } from './list'
import { markOverdue, markOverdueAcrossActiveTenants } from './mark-overdue'
import { retrieve } from './retrieve'
import { update } from './update'

export const invoices = {
  create,
  clone,
  list,
  retrieve,
  update,
  markOverdue,
  markOverdueAcrossActiveTenants,
  delete: deleteInvoice,
}
