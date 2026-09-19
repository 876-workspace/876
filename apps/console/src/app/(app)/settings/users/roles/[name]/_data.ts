import { cache } from 'react'

import { records } from '@/lib/records'

export const getRole = cache(async (name: string) =>
  records.roles.retrieve(name)
)
