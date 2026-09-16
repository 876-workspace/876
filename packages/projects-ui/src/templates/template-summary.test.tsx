// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TemplateSummary } from './template-summary'
import type { ProjectTemplate } from './types'

function makeTemplate(overrides?: Partial<ProjectTemplate>): ProjectTemplate {
  return {
    object: 'projects.project-template',
    id: 'tpl_agile',
    key: 'agile-sprint',
    name: 'Agile sprint',
    description: 'Two-week delivery cadence',
    currentVersion: 3,
    sourceProjectId: 'prj_apollo',
    counts: { phases: 4, taskLists: 2, workItems: 12, dependencies: 3 },
    createdAt: Date.UTC(2026, 0, 5) / 1000,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('TemplateSummary', () => {
  afterEach(cleanup)

  it('renders the template name as a heading', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    expect(
      screen.getByRole('heading', { name: 'Agile sprint' })
    ).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    expect(screen.getByText('Two-week delivery cadence')).toBeInTheDocument()
  })

  it('renders an em dash when there is no description', () => {
    render(<TemplateSummary template={makeTemplate({ description: null })} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the key as a code fact', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    const key = screen.getByText('agile-sprint')

    expect(key).toHaveClass('font-mono')
    expect(screen.getByText('Key')).toBeInTheDocument()
  })

  it('renders the current version as a badge', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    const badge = screen.getByText('v3')

    expect(badge).toHaveClass('text-secondary-foreground')
  })

  it('renders the source project fact', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    expect(screen.getByText('Source project')).toBeInTheDocument()
    expect(screen.getByText('prj_apollo')).toBeInTheDocument()
  })

  it('renders an em dash when the template has no source project', () => {
    render(
      <TemplateSummary template={makeTemplate({ sourceProjectId: null })} />
    )

    expect(screen.getByText('Source project')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the created and updated dates', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    expect(screen.getByText('Jan 5, 2026')).toBeInTheDocument()
    expect(screen.getByText('Mar 4, 2026')).toBeInTheDocument()
  })

  it('renders all four counts', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    expect(screen.getByText('Phases')).toBeInTheDocument()
    expect(screen.getByText('Task lists')).toBeInTheDocument()
    expect(screen.getByText('Work items')).toBeInTheDocument()
    expect(screen.getByText('Dependencies')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders zero counts as zero', () => {
    render(
      <TemplateSummary
        template={makeTemplate({
          counts: { phases: 0, taskLists: 0, workItems: 0, dependencies: 0 },
        })}
      />
    )

    expect(screen.getAllByText('0')).toHaveLength(4)
  })

  it('aligns the counts with tabular numerals', () => {
    render(<TemplateSummary template={makeTemplate()} />)

    expect(screen.getByText('12')).toHaveClass('tabular-nums')
  })
})
