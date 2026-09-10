import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Invoice item overview loading', () => {
  it('keeps the top-level page synchronous', () => {
    expect(source).toContain('export default function ItemDetailPage')
    expect(source).not.toContain('export default async function ItemDetailPage')
  })

  it('renders a dedicated overview skeleton while live item data resolves', () => {
    expect(source).toContain('fallback={<ItemOverviewSkeleton />}')
    expect(source).toContain('aria-label="Loading item overview"')
  })

  it('uses the request-cached detail resolver instead of retrieving the item directly', () => {
    expect(source).toContain('await resolveItemDetail(itemId)')
    expect(source).not.toContain('invoice.items.retrieve(itemId)')
  })
})
