import { Suspense } from 'react'
import { Page } from '@876/ui/page'

import { ReportsHeader } from './_components/reports-shell'
import {
  CashSummaryData,
  CashSummaryFallback,
  ReceivablesAgingData,
  ReceivablesAgingFallback,
  ReportControlFallback,
  ReportRangeControlData,
  SalesSummaryData,
  SalesSummaryFallback,
  SubscriptionSummaryData,
  SubscriptionSummaryFallback,
  TopItemsData,
  TopItemsFallback,
} from './_components/report-panels'
import type { RawReportSearchParams } from './_lib/report-params'

export const metadata = {
  title: 'Reports',
  description: 'Commercial performance reports grouped by currency.',
}

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawReportSearchParams>
}) {
  return (
    <Page>
      <ReportsHeader />
      <Suspense fallback={<ReportControlFallback />}>
        <ReportRangeControlData searchParams={searchParams} />
      </Suspense>
      <section className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<SalesSummaryFallback />}>
          <SalesSummaryData searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<CashSummaryFallback />}>
          <CashSummaryData searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<ReceivablesAgingFallback />}>
          <ReceivablesAgingData searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<SubscriptionSummaryFallback />}>
          <SubscriptionSummaryData searchParams={searchParams} />
        </Suspense>
        <div className="lg:col-span-2">
          <Suspense fallback={<TopItemsFallback />}>
            <TopItemsData searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </Page>
  )
}
