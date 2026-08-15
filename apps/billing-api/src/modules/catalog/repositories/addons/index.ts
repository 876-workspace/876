import { upsertAssociation, upsertAssociations } from './associations'
import { cloneAddon } from './clone'
import { create } from './create'
import { deleteAddon } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const addons = {
  create,
  clone: cloneAddon,
  list,
  retrieve,
  update,
  delete: deleteAddon,
  associations: { upsert: upsertAssociation, upsertMany: upsertAssociations },
}
