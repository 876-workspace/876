import { Suspense } from 'react'

import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { CurrenciesSection } from './currencies-section'
import { FinanceSectionNav } from './finance-section-nav'
import { FinanceSectionSkeleton } from './finance-section-skeleton'
import { PaymentModesSection } from './payment-modes-section'
import { TaxesSection } from './taxes-section'

type Props = { orgSlug: string; orgId: string; canManage: boolean }

/**
 * Finance settings: taxes, currencies and payment modes as one stacked page.
 * The title and section index render immediately; each section owns its own
 * Suspense boundary so one slow or failing section cannot hold the others.
 */
export function FinancePageContent({ orgSlug, orgId, canManage }: Props) {
  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Finance</PageTitle>
      </PageHeader>

      <FinanceSectionNav />

      <div className="space-y-10">
        <div id="taxes" data-finance-section="taxes" className="scroll-mt-20">
          <Suspense fallback={<FinanceSectionSkeleton label="Loading taxes" />}>
            <TaxesSection
              orgId={orgId}
              orgSlug={orgSlug}
              canManage={canManage}
            />
          </Suspense>
        </div>

        <div
          id="currencies"
          data-finance-section="currencies"
          className="scroll-mt-20"
        >
          <Suspense
            fallback={<FinanceSectionSkeleton label="Loading currencies" />}
          >
            <CurrenciesSection
              orgId={orgId}
              orgSlug={orgSlug}
              canManage={canManage}
            />
          </Suspense>
        </div>

        <div
          id="payment-modes"
          data-finance-section="payment-modes"
          className="scroll-mt-20"
        >
          <Suspense
            fallback={<FinanceSectionSkeleton label="Loading payment modes" />}
          >
            <PaymentModesSection
              orgId={orgId}
              orgSlug={orgSlug}
              canManage={canManage}
            />
          </Suspense>
        </div>
      </div>
    </Page>
  )
}
