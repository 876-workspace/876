import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing item activity loading', () => {
  it('keeps the top-level activity page synchronous', () => {
    expect(source).toContain('export default function ItemAuditPage')
    expect(source).not.toContain('export default async function ItemAuditPage')
  })

  it('preserves activity labels in the fallback while values load', () => {
    expect(source).toContain('fallback={<ItemAuditSkeleton />}')
    expect(source).toContain('aria-label="Loading item activity"')
    const skeleton = source.slice(source.indexOf('function ItemAuditSkeleton'))

    expect(skeleton).toMatch(/label="Created at"\s+value=\{<Skeleton/)
    expect(skeleton).toMatch(/label="Updated at"\s+value=\{<Skeleton/)
  })
})
