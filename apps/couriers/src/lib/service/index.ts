import 'server-only'

import { tenants } from './tenants'
import { customerProfiles } from './customer-profiles'
import { mailboxes } from './mailboxes'
import { packages } from './packages'
import { warehouses } from './warehouses'

export const service = {
  tenants,
  customerProfiles,
  mailboxes,
  packages,
  warehouses,
}
