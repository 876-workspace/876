import * as repository from './tenants.repository.js'

export function retrieveByOrganization(organizationId: string) {
  return repository.retrieveByOrganization(organizationId)
}

export function ensure(organizationId: string) {
  return repository.ensure(organizationId)
}
