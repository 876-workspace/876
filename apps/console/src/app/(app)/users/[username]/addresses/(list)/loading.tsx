'use client'

import { useParams } from 'next/navigation'
import { AddressesPageSkeleton } from '../_components/addresses-page-skeleton'

export default function Loading() {
  const { username } = useParams<{ username: string }>()
  return <AddressesPageSkeleton username={username} />
}
