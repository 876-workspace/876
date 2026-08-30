import { cache } from 'react'

import { service } from '@/lib/service'

export const getRole = cache(async (name: string) =>
  service.roles.retrieve(name)
)
