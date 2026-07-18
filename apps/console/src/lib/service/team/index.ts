import { create } from './create'
import { deleteMember } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

/** Console team members (access grants) — Console's own database. */
export const team = {
  retrieve,
  list,
  create,
  update,
  delete: deleteMember,
}
