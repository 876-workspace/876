import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { PRICES_SKELETON_COLUMNS } from '@/features/catalog/components/prices-skeleton-columns'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing item prices loading', () => {
  it('keeps the top-level prices page synchronous', () => {
    expect(source).toContain('export default function ItemPricesPage')
    expect(source).not.toContain('export default async function ItemPricesPage')
  })

  it('uses a real table skeleton while prices resolve', () => {
    expect(source).toContain(
      '<DataTableSkeleton columns={PRICES_SKELETON_COLUMNS} rows={5} />'
    )
    expect(source).toContain(
      "import { PRICES_SKELETON_COLUMNS } from '@/features/catalog/components/prices-skeleton-columns'"
    )
    expect(PRICES_SKELETON_COLUMNS).toHaveLength(6)
  })

  it('starts item validation and the prices list together', () => {
    expect(source).toContain('const [item, prices] = await Promise.all([')
  })
})
