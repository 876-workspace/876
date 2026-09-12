import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  'src/app/(app)/customers/[customerId]/layout.tsx',
  'utf8'
)
describe('Invoice customer detail layout', () => {
  it('uses the required ordered tab set without subscriptions', () => {
    expect(source).toMatch(
      /Overview[\s\S]*Transactions[\s\S]*Requests[\s\S]*Mails[\s\S]*Statement[\s\S]*Activity/
    )
    expect(source).not.toContain("label: 'Subscriptions'")
  })
  it('builds every href from the route params', () => {
    expect(source).toContain('const { customerId } = await params')
    expect(source).toContain('const base = `/customers/${customerId}`')
  })
  it('gives every placeholder tab visible content and a leaf loading skeleton', () => {
    for (const tab of ['mails', 'activity']) {
      const page = readFileSync(
        new URL(`./${tab}/page.tsx`, import.meta.url),
        'utf8'
      )
      const loading = readFileSync(
        new URL(`./${tab}/loading.tsx`, import.meta.url),
        'utf8'
      )

      expect(page).not.toContain('return null')
      expect(loading).toContain('CustomerTimelinePanelSkeleton')
    }
  })

  it('renders requests as a list/detail split owned by the segment layout', () => {
    const layout = readFileSync(
      new URL('./requests/layout.tsx', import.meta.url),
      'utf8'
    )
    const page = readFileSync(
      new URL('./requests/page.tsx', import.meta.url),
      'utf8'
    )

    expect(layout).toContain('RequestListDetailShell')
    expect(page).toContain('return null')
  })
})
