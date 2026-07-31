import { create } from './create'
import { del } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'
import { usage } from './usage'

export const addresses = { create, delete: del, list, retrieve, update, usage }
