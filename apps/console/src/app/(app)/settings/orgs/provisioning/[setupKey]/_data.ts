import { workspace } from '@/lib/services/workspace'
import { cache } from 'react'

export const getProvisioningSetup = cache(async (key: string) =>
  workspace.provisioning.setups.retrieve(key)
)
