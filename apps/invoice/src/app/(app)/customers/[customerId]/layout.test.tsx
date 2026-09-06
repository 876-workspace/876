import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/app/(app)/customers/[customerId]/layout.tsx', 'utf8')
describe('Invoice customer detail layout', () => {
  it('uses the required ordered tab set without subscriptions', () => { expect(source).toMatch(/Overview[\s\S]*Transactions[\s\S]*Requests[\s\S]*Mails[\s\S]*Statement[\s\S]*Activity/); expect(source).not.toContain("label: 'Subscriptions'") })
  it('builds every href from the route params', () => { expect(source).toContain('const { customerId } = await params'); expect(source).toContain('const base = `/customers/${customerId}`') })
})
