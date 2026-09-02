import { ClipboardList } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { QuotesList } from './quotes-list'
import type { ComponentProps } from 'react'

export async function QuotesListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const quotes = await service.quotes.list(context.tenant.id)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <QuotesList
        quotes={
          quotes as unknown as ComponentProps<typeof QuotesList>['quotes']
        }
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>No quotes yet</EmptyTitle>
              <EmptyDescription>
                Create a customer and item, then prepare the first draft quote.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
