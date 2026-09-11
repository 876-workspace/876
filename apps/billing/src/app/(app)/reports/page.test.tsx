import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing reports page', () => {
  it('threads URL params into every panel data component', () => {
    for (const component of [
      'SalesSummaryData',
      'CashSummaryData',
      'ReceivablesAgingData',
      'SubscriptionSummaryData',
      'TopItemsData',
    ]) {
      expect(source).toContain(`<${component} searchParams={searchParams} />`)
    }
  })

  it('keeps every panel behind an independent Suspense boundary', () => {
    for (const fallback of [
      'SalesSummaryFallback',
      'CashSummaryFallback',
      'ReceivablesAgingFallback',
      'SubscriptionSummaryFallback',
      'TopItemsFallback',
    ]) {
      expect(source).toContain(`fallback={<${fallback} />}`)
    }
  })

  it('resolves ranges from params in the tenant timezone, not the browser', () => {
    const panels = readFileSync(
      new URL('./_components/report-panels.tsx', import.meta.url),
      'utf8'
    )
    const params = readFileSync(
      new URL('./_lib/report-params.ts', import.meta.url),
      'utf8'
    )
    expect(panels).toContain('resolveReportPageParams(raw, context.timeZone')
    expect(panels).toContain('reports.salesSummary')
    expect(panels).toContain('reports.cashSummary')
    expect(panels).toContain('reports.receivablesAging')
    expect(panels).toContain('reports.subscriptionSummary')
    expect(panels).toContain('reports.itemSales')
    expect(params).toContain('resolveReportPreset')
    expect(params).not.toContain('window.')
  })

  it('maps service errors to error panel states without hiding siblings', () => {
    const panels = readFileSync(
      new URL('./_components/report-panels.tsx', import.meta.url),
      'utf8'
    )
    expect(panels).toContain("status: 'error'")
    expect(panels).not.toContain('throw new Error(result.error')
  })

  it('replaces the legacy report cards with live panels', () => {
    expect(source).not.toContain('ReportCard')
    expect(source).not.toContain('Issued invoice value')
  })

  it('keeps the reports guard at the layout', () => {
    const layout = readFileSync(
      new URL('./layout.tsx', import.meta.url),
      'utf8'
    )
    expect(layout).toContain("requirePagePermission('reports:read')")
  })
})
