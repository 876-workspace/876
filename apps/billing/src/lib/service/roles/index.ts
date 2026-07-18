import { create } from './create'
import { deleteRole } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const roles = { create, retrieve, list, update, delete: deleteRole }
