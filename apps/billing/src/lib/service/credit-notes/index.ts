import { apply } from './apply'
import { create } from './create'
import { listCreditNotes } from './list'
import { retrieve } from './retrieve'
import { voidCreditNote } from './void'

export const creditNotes = {
  apply,
  create,
  list: listCreditNotes,
  retrieve,
  void: voidCreditNote,
}
