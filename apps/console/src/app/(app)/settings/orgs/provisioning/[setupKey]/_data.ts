import { cache } from 'react'

import { workspace } from '@/lib/876'

export const getProvisioningSetup = cache(async (key: string) =>
  workspace.provisioning.setups.retrieve(key)
)
