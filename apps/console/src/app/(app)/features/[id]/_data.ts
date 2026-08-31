import { workspace } from '@/lib/services/workspace'
import { cache } from 'react'

export const resolveFeature = cache(async (id: string) => {
  const { data } = await workspace.features.retrieve(id)
  return data
})
