// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const layoutSource = readFileSync(
  new URL('./layout.tsx', import.meta.url),
  'utf8'
)

describe('OrganizationDetailLayout', () => {
  it('renders the Organizations back link above the detail header', () => {
    expect(layoutSource).toContain(
      '<PageBreadcrumb href="/orgs" label="Organizations" className="mb-4" />'
    )
    expect(layoutSource.indexOf('<PageBreadcrumb')).toBeLessThan(
      layoutSource.indexOf('<DetailCard aria-label="Organization">')
    )
  })

  it('keeps the organization header and entitled tab strip', () => {
    expect(layoutSource).toContain('<OrgCardHeader slug={slug} />')
    expect(layoutSource).toContain('<EntitledCardTabs slug={slug} />')
  })

  it('does not render a list pane or a list/detail shell', () => {
    expect(layoutSource).not.toContain('ListPane')
    expect(layoutSource).not.toContain('ListDetail')
  })

  it('keeps unknown organizations on the streamed not-found path', () => {
    expect(layoutSource).toContain(
      "if (result.error?.code === 'organization/not-found') notFound()"
    )
  })
})
