import { cache } from 'react'

import { $876 } from '@/lib/876'

export const resolveFeature = cache(async (id: string) => {
  const { data } = await $876.features.retrieve(id)
  return data
})
