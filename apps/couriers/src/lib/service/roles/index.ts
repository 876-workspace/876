import { create } from './create'
import { deleteRole } from './delete'
import { ensureDefaults } from './ensure-defaults'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const roles = {
  list,
  retrieve,
  create,
  update,
  delete: deleteRole,
  ensureDefaults,
}
