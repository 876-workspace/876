import { Page, PageBreadcrumb } from '@876/ui/page'

import { PriorityForm } from '../_components/priority-form'

export const metadata = { title: 'Add priority - Settings' }

export default function NewPriorityPage() {
  return (
    <Page>
      <PageBreadcrumb
        href="/settings/priorities"
        label="Priorities"
        className="mb-4"
      />
      <h1 className="876-page-title mb-6">Add priority</h1>
      <PriorityForm />
    </Page>
  )
}
