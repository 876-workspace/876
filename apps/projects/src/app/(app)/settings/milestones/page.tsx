import { redirect } from 'next/navigation'

import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata = { title: 'Phases' }

export default async function MilestonesPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  redirect('/phases')
}
