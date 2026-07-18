import { create } from './create'
import { deleteItem } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const items = { create, retrieve, list, update, delete: deleteItem }
