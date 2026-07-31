import { create } from './create'
import { ensureDefault, resolveDefaultBranchAddress } from './ensure-default'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const branches = {
  create,
  ensureDefault,
  resolveDefaultAddress: resolveDefaultBranchAddress,
  list,
  retrieve,
  update,
}
