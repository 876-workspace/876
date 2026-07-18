import { create } from './create'
import { deleteRole } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

/** Console role catalog — Console's own database. */
export const roles = {
  retrieve,
  list,
  create,
  update,
  delete: deleteRole,
}
