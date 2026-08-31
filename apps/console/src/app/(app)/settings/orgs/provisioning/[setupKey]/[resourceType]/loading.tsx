'use client'

import { useParams } from 'next/navigation'
import { ProvisioningResourceTypeSkeleton } from '@/features/provisioning/components/provisioning-page-skeleton'

export default function Loading() {
  const params = useParams<{ resourceType?: string }>()
  return (
    <ProvisioningResourceTypeSkeleton resourceType={params?.resourceType} />
  )
}
