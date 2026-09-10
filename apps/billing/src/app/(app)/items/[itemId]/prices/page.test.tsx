import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing item prices loading', () => {
  it('keeps the top-level prices page synchronous', () => {
    expect(source).toContain('export default function ItemPricesPage')
    expect(source).not.toContain('export default async function ItemPricesPage')
  })

  it('uses a real table skeleton while prices resolve', () => {
    expect(source).toContain('<DataTableSkeleton columns={priceSkeletonColumns} rows={5} />')
    expect(source).toContain("{ label: 'Catalog target' }")
    expect(source).toContain("{ label: 'Status', cell: 'badge' }")
  })

  it('starts item validation and the prices list together', () => {
    expect(source).toContain('const [item, prices] = await Promise.all([')
  })
})
