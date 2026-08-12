import { Page } from '@876/ui/page'

import { ReportsFallback, ReportsHeader } from './_components/reports-shell'

export default function Loading() {
  return (
    <Page>
      <ReportsHeader />
      <ReportsFallback />
    </Page>
  )
}
