import { workspace } from '@/lib/clients/workspace'
import { cache } from 'react'

export const getProvisioningSetup = cache(async (key: string) =>
  workspace.provisioning.setups.retrieve(key)
)
