import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing item overview loading', () => {
  it('keeps the top-level page synchronous', () => {
    expect(source).toContain('export default function ItemDetailPage')
    expect(source).not.toContain('export default async function ItemDetailPage')
  })

  it('renders a dedicated overview skeleton while live item data resolves', () => {
    expect(source).toContain('fallback={<ItemOverviewSkeleton />}')
    expect(source).toContain('aria-label="Loading item overview"')
  })

  it('keeps live workspace and item reads inside the streamed data component', () => {
    const dataStart = source.indexOf('async function ItemOverviewData')
    const workspaceRead = source.indexOf('await getWorkspaceContext()')
    const itemRead = source.indexOf('await resolveItem(')

    expect(dataStart).toBeGreaterThan(-1)
    expect(workspaceRead).toBeGreaterThan(dataStart)
    expect(itemRead).toBeGreaterThan(dataStart)
  })
})

describe('Billing item sales overview', () => {
  it('renders the item sales summary in its own Suspense boundary', () => {
    expect(source).toContain('fallback={<ItemSalesSummaryFallback />}')
    expect(source).toContain('<ItemSalesSummaryData itemId={item.id} />')
  })

  it('feeds the panel from the item sales summary', () => {
    const component = readFileSync(
      new URL('./_components/item-sales-summary.tsx', import.meta.url),
      'utf8'
    )
    expect(component).toContain('billing.items.salesSummary(itemId)')
    expect(component).toContain('quantitySold')
    expect(component).toContain('quantityReturned')
  })

  it('maps service errors to an error panel state', () => {
    const component = readFileSync(
      new URL('./_components/item-sales-summary.tsx', import.meta.url),
      'utf8'
    )
    expect(component).toContain("status: 'error'")
    expect(component).toContain('ItemSalesSummaryPanelSkeleton')
  })
})
