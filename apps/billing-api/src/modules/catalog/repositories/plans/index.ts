import { create } from './create'
import { clonePlan } from './clone'
import { deletePlan } from './delete'
import { ensure } from './ensure'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const plans = {
  create,
  clone: clonePlan,
  retrieve,
  list,
  update,
  delete: deletePlan,
  ensure,
}
