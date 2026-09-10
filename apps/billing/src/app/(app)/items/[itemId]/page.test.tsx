import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Billing item overview loading', () => {
  it('keeps the top-level page synchronous', () => {
    expect(source).toContain('export default function ItemDetailPage')
    expect(source).not.toContain('export default async function ItemDetailPage')
  })

  it('renders a dedicated overview skeleton while live item data resolves', () => {
    expect(source).toContain('fallback={<ItemOverviewSkeleton />}')
    expect(source).toContain('aria-label="Loading item overview"')
  })

  it('keeps live workspace and item reads inside the streamed data component', () => {
    const dataStart = source.indexOf('async function ItemOverviewData')
    const workspaceRead = source.indexOf('await getWorkspaceContext()')
    const itemRead = source.indexOf('await resolveItem(')

    expect(dataStart).toBeGreaterThan(-1)
    expect(workspaceRead).toBeGreaterThan(dataStart)
    expect(itemRead).toBeGreaterThan(dataStart)
  })
})
