import { provision } from './provision'
import {
  listByOrganizationIds,
  retrieveByOrganizationId,
  retrieveBySlug,
} from './retrieve'

export const tenants = {
  provision,
  listByOrganizationIds,
  retrieveByOrganizationId,
  retrieveBySlug,
}
