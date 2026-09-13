// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactElement } from 'react'
import type { AdminOrganization } from '@876/platform/compat'
import { describe, expect, it } from 'vitest'

import { buildOrgColumns } from './columns'

function renderNameCell(org: Partial<AdminOrganization>) {
  const [nameColumn] = buildOrgColumns({})
  const cell = nameColumn.cell as (context: {
    row: { original: Partial<AdminOrganization> }
  }) => ReactElement
  return render(cell({ row: { original: org } }))
}

describe('buildOrgColumns name cell', () => {
  it('links the organization to its standalone detail page by slug', () => {
    renderNameCell({ name: 'Acme Freight', slug: 'acme', logo_url: null })

    expect(screen.getByRole('link', { name: 'Acme Freight' })).toHaveAttribute(
      'href',
      '/orgs/acme'
    )
  })

  it('never links to the retired singular /org route', () => {
    renderNameCell({ name: 'Sterling', slug: 'sterling', logo_url: null })

    expect(
      screen.getByRole('link', { name: 'Sterling' }).getAttribute('href')
    ).not.toMatch(/^\/org\//)
  })
})
