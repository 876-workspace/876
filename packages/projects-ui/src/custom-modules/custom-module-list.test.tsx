// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CustomModuleList } from './custom-module-list'
import type { CustomModule } from './types'

function makeModule(overrides?: Partial<CustomModule>): CustomModule {
  return {
    object: 'projects.custom-module',
    id: 'mod_1',
    key: 'risks',
    scope: 'project',
    projectId: 'proj_1',
    singularName: 'Risk',
    pluralName: 'Risks',
    icon: 'alert',
    version: 1,
    fieldCount: 3,
    recordCount: 7,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('CustomModuleList', () => {
  afterEach(cleanup)

  it('links the module name to its detail path', () => {
    render(<CustomModuleList modules={[makeModule()]} hrefBase="/modules" />)

    expect(
      within(screen.getByRole('table')).getByRole('link', { name: 'Risks' })
    ).toHaveAttribute('href', '/modules/mod_1')
  })

  it('encodes the module id in the href', () => {
    render(
      <CustomModuleList
        modules={[makeModule({ id: 'mod/one two' })]}
        hrefBase="/modules"
      />
    )

    expect(
      within(screen.getByRole('table')).getByRole('link', { name: 'Risks' })
    ).toHaveAttribute('href', '/modules/mod%2Fone%20two')
  })

  it('trims a trailing slash on hrefBase', () => {
    render(<CustomModuleList modules={[makeModule()]} hrefBase="/modules/" />)

    expect(
      within(screen.getByRole('table')).getByRole('link', { name: 'Risks' })
    ).toHaveAttribute('href', '/modules/mod_1')
  })

  it('renders the project scope badge', () => {
    render(<CustomModuleList modules={[makeModule()]} hrefBase="/modules" />)

    expect(
      within(screen.getByRole('table')).getByText('Project')
    ).toBeInTheDocument()
  })

  it('renders the organization scope badge', () => {
    render(
      <CustomModuleList
        modules={[makeModule({ scope: 'org', projectId: null })]}
        hrefBase="/modules"
      />
    )

    expect(
      within(screen.getByRole('table')).getByText('Organization')
    ).toBeInTheDocument()
  })

  it('renders the field and record counts', () => {
    render(<CustomModuleList modules={[makeModule()]} hrefBase="/modules" />)

    const table = within(screen.getByRole('table'))
    expect(table.getByText('3 fields')).toBeInTheDocument()
    expect(table.getByText('7 records')).toBeInTheDocument()
  })

  it('renders the updated date', () => {
    render(<CustomModuleList modules={[makeModule()]} hrefBase="/modules" />)

    expect(
      within(screen.getByRole('table')).getByText('Mar 4, 2026')
    ).toBeInTheDocument()
  })

  it('labels the columns in table order', () => {
    render(<CustomModuleList modules={[makeModule()]} hrefBase="/modules" />)

    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toEqual(['Name', 'Scope', 'Fields', 'Records', 'Updated'])
  })

  it('renders a mobile row per module', () => {
    const { container } = render(
      <CustomModuleList modules={[makeModule()]} hrefBase="/modules" />
    )
    const list = container.querySelector('ul')
    if (!list) throw new Error('Expected a mobile list')

    expect(
      within(list).getByRole('link', { name: 'View module Risks' })
    ).toHaveAttribute('href', '/modules/mod_1')
  })

  it('renders the empty state with no links', () => {
    const { container } = render(
      <CustomModuleList modules={[]} hrefBase="/modules" />
    )

    expect(screen.getAllByText('No custom modules yet')).toHaveLength(2)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
