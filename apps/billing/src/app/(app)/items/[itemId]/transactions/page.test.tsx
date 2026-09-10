import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing item transaction loading', () => {
  it('keeps the top-level transactions page synchronous', () => {
    expect(source).toContain('export default function ItemTransactionsPage')
    expect(source).not.toContain(
      'export default async function ItemTransactionsPage'
    )
  })

  it('renders a placeholder-shaped fallback while item validation resolves', () => {
    expect(source).toContain('fallback={<ItemTransactionsSkeleton />}')
    expect(source).toContain('aria-label="Loading item transactions"')
  })
})
