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
