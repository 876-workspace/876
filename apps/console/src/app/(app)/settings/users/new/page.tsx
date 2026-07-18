import { PromoteUserForm } from '../promote-user-form'
import {
  Page,
  PageBreadcrumb,
  PageHeader,
  PageTitle,
  PageDescription,
} from '@876/ui/page'

export const metadata = { title: 'Add Member - Team' }

export default function AddTeamMemberPage() {
  return (
    <Page>
      <PageBreadcrumb
        href="/settings/users"
        label="Console Users"
        className="mb-4"
      />

      <PageHeader>
        <PageTitle>Add Team Member</PageTitle>
        <PageDescription>
          Search for a user and assign them a Console role.
        </PageDescription>
      </PageHeader>

      <div className="876-card max-w-lg p-6">
        <PromoteUserForm />
      </div>
    </Page>
  )
}
