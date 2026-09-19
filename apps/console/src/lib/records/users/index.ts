import { create } from './create'
import { deleteUser } from './delete'
import { setRole } from './set-role'
import { update } from './update'

/** Platform users — orchestrated through `$876` with Console-side authz. */
export const users = {
  create,
  update,
  delete: deleteUser,
  setRole,
}
