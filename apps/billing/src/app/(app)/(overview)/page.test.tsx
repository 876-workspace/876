import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing dashboard reporting', () => {
  it('adds sales and overdue cards behind independent boundaries', () => {
    expect(source).toContain('<DashboardSalesMonthData />')
    expect(source).toContain('<DashboardOverdueData />')
    expect(source).toContain('fallback={<MetricCardFallback label=')
  })

  it('adds a compact sales panel behind its own boundary', () => {
    expect(source).toContain('<DashboardCompactSalesData />')
    expect(source).toContain('fallback={<DashboardCompactSalesFallback />}')
  })

  it('feeds the new cards from reporting aggregates', () => {
    const reports = readFileSync(
      new URL('./_components/dashboard-reports.tsx', import.meta.url),
      'utf8'
    )
    expect(reports).toContain('reports.salesSummary')
    expect(reports).toContain('reports.receivablesAging')
    expect(reports).toContain('Sales this month')
    expect(reports).toContain('Overdue receivables')
  })

  it('carries no prose under section headings', () => {
    expect(source).not.toContain('(Does not include one-off invoices)')
    expect(source).not.toContain(
      'Total value of issued invoices and pending balances.'
    )
    expect(source).not.toContain(
      'Contracted recurring value from active subscriptions.'
    )
  })
})
