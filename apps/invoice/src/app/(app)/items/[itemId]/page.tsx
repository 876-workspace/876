import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardIcon,
  DetailCardIdBar,
  DetailCardSection,
} from '@876/ui/detail-card'
import { CircleStackIcon, WrenchScrewdriverIcon } from '@876/ui/icons'

import { getInvoice } from '@/lib/invoice'
import { formatMoney } from '@/lib/format'
import { ItemActions } from './_components/item-actions'

interface Props {
  params: Promise<{ itemId: string }>
}

export const metadata: Metadata = {
  title: 'Item',
  description: 'Item details.',
}

export default async function ItemDetailPage({ params }: Props) {
  const { itemId } = await params
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const result = await invoice.items.retrieve(itemId)

  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return (
      <DetailCard aria-label="Item unavailable">
        <DetailCardBody>
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm font-medium">Item unavailable</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Please try again shortly.
            </p>
          </div>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const item = result.data
  const currency = item.defaultSellingCurrency ?? 'JMD'
  const canManage = invoice.role !== 'staff'
  const isService = item.type === 'SERVICE'
  const typeLabel = isService ? 'Service' : 'Good'

  return (
    <DetailCard aria-label={`Item details: ${item.name}`}>
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            {isService ? (
              <WrenchScrewdriverIcon className="size-5" />
            ) : (
              <CircleStackIcon className="size-5" />
            )}
          </DetailCardIcon>
        }
        title={item.name}
        meta={
          <>
            <Badge variant={item.isActive ? 'success' : 'secondary'}>
              {item.isActive ? 'Active' : 'Archived'}
            </Badge>
            <Badge variant="outline">{typeLabel}</Badge>
          </>
        }
        subtitle={item.sku ? `SKU ${item.sku}` : undefined}
        actions={
          <ItemActions
            itemId={item.id}
            itemName={item.name}
            isActive={item.isActive}
            canManage={canManage}
          />
        }
        closeHref="/items"
        closeLabel="Close item details"
      />

      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(item.defaultSellingAmount, currency)}
          caption={[
            'Default selling price',
            item.unit ? `per ${item.unit}` : null,
            item.isTaxable ? 'taxable' : 'non-taxable',
          ]
            .filter(Boolean)
            .join(' · ')}
        />

        {item.description ? (
          <DetailCardSection title="Description">
            <p className="text-foreground text-sm leading-6">
              {item.description}
            </p>
          </DetailCardSection>
        ) : null}

        <DetailCardSection title="Item">
          <DetailCardFacts>
            <DetailCardFact label="Type" value={typeLabel} />
            <DetailCardFact label="SKU" value={item.sku ?? '—'} mono />
            <DetailCardFact label="Unit" value={item.unit ?? '—'} />
          </DetailCardFacts>
        </DetailCardSection>

        <DetailCardSection title="Billing">
          <DetailCardFacts>
            <DetailCardFact label="Currency" value={currency} mono />
            <DetailCardFact
              label="Tax"
              value={item.isTaxable ? 'Taxable' : 'Non-taxable'}
            />
            <DetailCardFact label="Tax code" value={item.taxCode ?? '—'} mono />
          </DetailCardFacts>
        </DetailCardSection>
      </DetailCardBody>

      <DetailCardIdBar>
        <span className="truncate">{item.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
