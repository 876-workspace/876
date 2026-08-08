import { create } from './create'
import { deleteCustomer } from './delete'
import { ensure } from './ensure'
import { list } from './list'
import { retrieve, retrieveByTenantAndUser } from './retrieve'
import { update } from './update'

export const customerProfiles = {
  create,
  ensure,
  list,
  retrieve,
  retrieveByTenantAndUser,
  update,
  delete: deleteCustomer,
}
