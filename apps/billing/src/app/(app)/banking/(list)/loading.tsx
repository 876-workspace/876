import { Page } from '@876/ui/page'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import { BankingFallback } from '../_components/banking-fallback'

export default function Loading() {
  return (
    <Page>
      <StreamingResourceToolbar
        title="Banking"
        status="all"
        options={[
          { value: 'all', label: 'All', headingLabel: 'All Bank Accounts' },
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived' },
        ]}
        primary={{
          label: 'Add',
          href: '/banking/new',
          permission: 'banking:write',
        }}
      />
      <BankingFallback />
    </Page>
  )
}
