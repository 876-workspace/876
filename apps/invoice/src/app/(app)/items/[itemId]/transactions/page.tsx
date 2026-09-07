import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@876/ui/empty'
import { DocumentTextIcon } from '@876/ui/icons'

export const metadata = {
  title: 'Item transactions',
  description: 'Documents that use this item.',
}

export default function ItemTransactionsPage() {
  return (
    <Empty className="py-14">
      <EmptyHeader>
        <DocumentTextIcon className="text-muted-foreground size-6" />
        <EmptyTitle>No transactions</EmptyTitle>
        <EmptyDescription>
          This item has not been used on an invoice or quote.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
