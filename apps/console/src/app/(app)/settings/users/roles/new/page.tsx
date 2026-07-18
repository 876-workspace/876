import { CreateRoleForm } from './create-role-form'
import { Page, PageHeader, PageTitle, PageDescription } from '@876/ui/page'

export const metadata = { title: 'New Role - Roles' }

export default function NewRolePage() {
  return (
    <Page>
      <PageHeader>
        <PageTitle>New Role</PageTitle>
        <PageDescription>
          Create a custom role with a tailored permission set.
        </PageDescription>
      </PageHeader>

      <CreateRoleForm />
    </Page>
  )
}
