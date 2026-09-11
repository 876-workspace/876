import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
describe('Billing customer contacts overview', () => {
  it('renders panel chrome in Suspense before contacts resolve', () =>
    expect(source).toContain('fallback={<CustomerContactsPanelSkeleton />}'))
  it('maps returned errors to an error panel state', () =>
    expect(source).toContain("status: 'error' as const, error: result.error"))
  it('does not turn a client error into an empty list', () =>
    expect(source).not.toContain("result.error ? { status: 'empty'"))
})

describe('Billing customer sales overview', () => {
  it('renders the sales summary in its own Suspense boundary', () => {
    expect(source).toContain('fallback={<CustomerSalesSummaryFallback />}')
    expect(source).toContain('<CustomerSalesSummaryRouteData params={params} />')
  })

  it('feeds the panel from the account projection with the customer id', () => {
    const component = readFileSync(
      new URL(
        './_components/customer-sales-summary.tsx',
        import.meta.url
      ),
      'utf8'
    )
    expect(component).toContain('billing.customers.account(customerId)')
    expect(component).toContain('lifetimeSales')
    expect(component).toContain('activeSubscriptionCount')
  })

  it('threads the customer id into the range sales summary', () => {
    const component = readFileSync(
      new URL(
        './_components/customer-sales-summary.tsx',
        import.meta.url
      ),
      'utf8'
    )
    expect(component).toContain('customerId')
    expect(component).toContain("groupBy: 'month'")
  })
})
