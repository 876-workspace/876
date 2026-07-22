import 'server-only'

import { tenants } from './tenants'
import { customerProfiles } from './customer-profiles'
import { mailboxes } from './mailboxes'
import { packages } from './packages'
import { warehouses } from './warehouses'
import { roles } from './roles'
import { team } from './team'

export const service = {
  tenants,
  customerProfiles,
  mailboxes,
  packages,
  warehouses,
  roles,
  team,
}
