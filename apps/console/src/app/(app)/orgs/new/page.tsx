import { CreateOrgForm } from './_components/create-org-form'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

export const metadata = { title: 'New Organization' }

export default function NewOrganizationPage() {
  return (
    <Page>
      <PageBreadcrumb href="/orgs" label="Organizations" className="mb-4" />

      <PageHeader>
        <PageTitle>New Organization</PageTitle>
        <PageDescription>
          Create a new organization on the platform.
        </PageDescription>
      </PageHeader>

      <CreateOrgForm />
    </Page>
  )
}
