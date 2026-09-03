import type { Metadata } from 'next'

import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'

export const metadata: Metadata = { title: 'Forms - Requests' }

export default function PlatformRequestFormsPage() {
  return (
    <EmptyWorkspaceView
      title="Forms"
      description="No request forms are published for 876 support yet."
      iconKey="forms"
    />
  )
}
