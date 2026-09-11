import { Suspense } from 'react'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { requireAppPermission } from '@/lib/auth/guards'

import {
  CashSummaryData,
  CashSummaryFallback,
  ReceivablesAgingData,
  ReceivablesAgingFallback,
  ReportControlFallback,
  ReportRangeControlData,
  SalesSummaryData,
  SalesSummaryFallback,
  TopItemsData,
  TopItemsFallback,
} from './_components/report-panels'
import type { RawReportSearchParams } from './_lib/report-params'

const REPORT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Reports' },
]

export const metadata = {
  title: 'Reports',
  description: 'Commercial performance reports grouped by currency.',
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawReportSearchParams>
}) {
  await requireAppPermission('reports.view')

  return (
    <Page>
      <ResourceToolbar
        title="Reports"
        titleFilter={
          <StatusFilterHeading
            label="Reports"
            value="all"
            options={REPORT_STATUS_OPTIONS}
          />
        }
        primaryLabel="New"
        primaryHref="/reports/new"
        primaryVariant="info"
        refresh
      />
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
        <div className="lg:col-span-2">
          <Suspense fallback={<TopItemsFallback />}>
            <TopItemsData searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </Page>
  )
}
