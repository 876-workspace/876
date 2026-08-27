import { Page, PageBreadcrumb } from '@876/ui/page'

import { TeamForm } from '../_components/team-form'

export const metadata = { title: 'Add Team - Settings' }

export default function NewTeamPage() {
  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-6">Add team</h1>
      <TeamForm />
    </Page>
  )
}
