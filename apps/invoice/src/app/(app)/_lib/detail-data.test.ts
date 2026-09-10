import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./detail-data.ts', import.meta.url), 'utf8')

describe('Invoice detail data', () => {
  it('memoizes item detail reads with React cache', () => {
    expect(source).toContain("import { cache } from 'react'")
    expect(source).toContain('export const resolveItemDetail = cache(')
  })

  it('uses a primitive item id cache key', () => {
    expect(source).toContain('async (itemId: string) =>')
    expect(source).not.toContain('async ({ itemId }')
  })

  it('retrieves the item through the existing Invoice facade', () => {
    expect(source).toContain('const invoice = await getInvoice()')
    expect(source).toContain('await invoice.items.retrieve(itemId)')
  })
})
