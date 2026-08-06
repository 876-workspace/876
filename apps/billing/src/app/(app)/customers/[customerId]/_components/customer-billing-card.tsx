import { CreditCard } from '@876/ui/icons'

import {
  DetailAccordionCard,
  Fact,
  FactGrid,
} from '@/components/patterns/detail/detail-accordion'
import { formatDate } from '@/lib/format'

import { formatCustomerType } from '../_lib/customer-detail-helpers'

export function CustomerBillingCard({
  customerType,
  currency,
  reference,
  createdAt,
}: {
  customerType: string
  currency: string
  reference: string
  createdAt: number
}) {
  return (
    <DetailAccordionCard title="Billing" icon={CreditCard} tone="violet">
      <FactGrid>
        <Fact label="Type" value={formatCustomerType(customerType)} />
        <Fact label="Currency" value={currency} />
        <Fact label="Reference" value={reference} mono />
        <Fact label="Added" value={formatDate(createdAt)} />
      </FactGrid>
    </DetailAccordionCard>
  )
}
