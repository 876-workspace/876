// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TemplateList } from './template-list'
import type { ProjectTemplate } from './types'

function makeTemplate(overrides?: Partial<ProjectTemplate>): ProjectTemplate {
  return {
    object: 'projects.project-template',
    id: 'tpl_agile',
    key: 'agile-sprint',
    name: 'Agile sprint',
    description: 'Two-week delivery cadence',
    currentVersion: 3,
    sourceProjectId: null,
    counts: { phases: 4, taskLists: 2, workItems: 12, dependencies: 3 },
    createdAt: Date.UTC(2026, 0, 5) / 1000,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

function mobileList(container: HTMLElement): HTMLElement {
  const list = container.querySelector('ul')
  if (!list) throw new Error('Expected a mobile list')
  return list as HTMLElement
}

describe('TemplateList', () => {
  afterEach(cleanup)

  it('links the template name to its detail path', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Agile sprint',
      })
    ).toHaveAttribute('href', '/app/templates/tpl_agile')
  })

  it('encodes the template id in the href', () => {
    render(
      <TemplateList
        templates={[makeTemplate({ id: 'tpl/one two' })]}
        hrefBase="/app/templates"
      />
    )

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Agile sprint',
      })
    ).toHaveAttribute('href', '/app/templates/tpl%2Fone%20two')
  })

  it('trims a trailing slash on hrefBase', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates/" />
    )

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Agile sprint',
      })
    ).toHaveAttribute('href', '/app/templates/tpl_agile')
  })

  it('renders the name as the row link and keeps the description secondary', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    const link = within(screen.getByRole('table')).getByRole('link', {
      name: 'Agile sprint',
    })

    expect(link).toHaveClass('font-medium')
    expect(screen.getAllByText('Two-week delivery cadence')).toHaveLength(1)
    expect(screen.getByText('Two-week delivery cadence')).toHaveClass(
      'text-muted-foreground'
    )
  })

  it('renders the key as muted metadata', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    const key = within(screen.getByRole('table')).getByText('agile-sprint')

    expect(key).toHaveClass('text-muted-foreground')
    expect(key).toHaveClass('font-mono')
  })

  it('renders the current version', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    expect(
      within(screen.getByRole('table')).getByText('v3')
    ).toBeInTheDocument()
  })

  it('renders the definition counts on one line', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    expect(
      within(screen.getByRole('table')).getByText(
        '4 phases · 2 task lists · 12 work items · 3 dependencies'
      )
    ).toBeInTheDocument()
  })

  it('singularizes each count of one', () => {
    render(
      <TemplateList
        templates={[
          makeTemplate({
            counts: {
              phases: 1,
              taskLists: 1,
              workItems: 1,
              dependencies: 1,
            },
          }),
        ]}
        hrefBase="/app/templates"
      />
    )

    expect(
      within(screen.getByRole('table')).getByText(
        '1 phase · 1 task list · 1 work item · 1 dependency'
      )
    ).toBeInTheDocument()
  })

  it('renders empty counts as zero, not an em dash', () => {
    render(
      <TemplateList
        templates={[
          makeTemplate({
            counts: {
              phases: 0,
              taskLists: 0,
              workItems: 0,
              dependencies: 0,
            },
          }),
        ]}
        hrefBase="/app/templates"
      />
    )

    expect(
      within(screen.getByRole('table')).getByText(
        '0 phases · 0 task lists · 0 work items · 0 dependencies'
      )
    ).toBeInTheDocument()
  })

  it('renders the updated date', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    expect(
      within(screen.getByRole('table')).getByText('Mar 4, 2026')
    ).toBeInTheDocument()
  })

  it('labels the columns in table order', () => {
    render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toEqual(['Template', 'Key', 'Version', 'Counts', 'Updated'])
  })

  it('renders a mobile row per template with the key, version, and updated date', () => {
    const { container } = render(
      <TemplateList templates={[makeTemplate()]} hrefBase="/app/templates" />
    )

    const list = mobileList(container)

    expect(list.querySelectorAll(':scope > li')).toHaveLength(1)
    expect(within(list).getByText('agile-sprint · v3')).toBeInTheDocument()
    expect(within(list).getByText('Mar 4, 2026')).toBeInTheDocument()
    expect(
      within(list).getByRole('link', { name: 'View template Agile sprint' })
    ).toHaveAttribute('href', '/app/templates/tpl_agile')
  })

  it('renders the empty state as a title with no call to action', () => {
    const { container } = render(
      <TemplateList templates={[]} hrefBase="/app/templates" />
    )

    expect(screen.getAllByText('No templates yet')).toHaveLength(2)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('keeps the table mounted with a header row and the empty state when there are no templates', () => {
    render(<TemplateList templates={[]} hrefBase="/app/templates" />)

    const table = screen.getByRole('table')

    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(
      within(mobileList(document.body)).queryAllByRole('link')
    ).toHaveLength(0)
  })
})
