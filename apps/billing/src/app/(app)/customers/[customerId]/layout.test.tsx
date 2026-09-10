import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  'src/app/(app)/customers/[customerId]/layout.tsx',
  'utf8'
)
describe('Billing customer detail layout', () => {
  it('uses the required ordered tab set', () => {
    expect(source).toContain("'Overview', href: base")
    expect(source).toMatch(
      /Overview[\s\S]*Transactions[\s\S]*Subscriptions[\s\S]*Requests[\s\S]*Mails[\s\S]*Statement[\s\S]*Activity/
    )
  })
  it('includes subscriptions for Billing', () => {
    expect(source).toContain("label: 'Subscriptions'")
  })
  it('gives every placeholder tab visible content and a leaf loading skeleton', () => {
    for (const tab of ['subscriptions', 'requests', 'mails', 'activity']) {
      const page = readFileSync(new URL(`./${tab}/page.tsx`, import.meta.url), 'utf8')
      const loading = readFileSync(
        new URL(`./${tab}/loading.tsx`, import.meta.url),
        'utf8'
      )

      expect(page).not.toContain('return null')
      expect(loading).toContain('CustomerTimelinePanelSkeleton')
    }
  })
})
