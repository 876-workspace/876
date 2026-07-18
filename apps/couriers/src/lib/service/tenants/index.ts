import { create } from './create'
import { update } from './update'
import {
  retrieve,
  retrieveBySlug,
  retrieveByOrgId,
  retrieveByHostname,
} from './retrieve'

export const tenants = {
  create,
  update,
  retrieve,
  retrieveBySlug,
  retrieveByOrgId,
  retrieveByHostname,
}
