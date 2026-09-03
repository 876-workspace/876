import type { Metadata } from 'next'

import { requireAppPermission } from '@/lib/auth/require-projects-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Projects, issues, and the work this organization is tracking.',
}

export default async function HomePage() {
  await requireAppPermission('dashboard.view')
  const { orgName } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <h1 className="876-page-title">Projects</h1>
      <p className="text-muted-foreground mt-2 text-sm">{orgName}</p>
    </div>
  )
}
