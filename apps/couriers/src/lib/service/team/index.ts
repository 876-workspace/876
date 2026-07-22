import { create } from './create'
import { deleteTeamMember } from './delete'
import { ensure } from './ensure'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const team = {
  list,
  retrieve,
  create,
  ensure,
  update,
  delete: deleteTeamMember,
}
