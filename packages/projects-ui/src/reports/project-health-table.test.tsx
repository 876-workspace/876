// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { HealthReport, ProjectHealthRow } from './types'
import { ProjectHealthTable } from './project-health-table'

function makeRow(overrides?: Partial<ProjectHealthRow>): ProjectHealthRow {
  return {
    projectId: 'prj_1',
    name: 'Apollo',
    health: 'on-track',
    progressPercent: 40,
    overdue: 0,
    openItems: 5,
    budgetConsumedPercent: 20,
    ...overrides,
  }
}

function makeReport(rows: ProjectHealthRow[]): HealthReport {
  return { object: 'projects.health-report', data: rows }
}

describe('ProjectHealthTable', () => {
  afterEach(cleanup)

  it('links each project to the detail path', () => {
    render(
      <ProjectHealthTable
        report={makeReport([makeRow()])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getByRole('link', { name: 'Apollo' })).toHaveAttribute(
      'href',
      '/app/projects/prj_1'
    )
  })

  it('encodes the project id in the href', () => {
    render(
      <ProjectHealthTable
        report={makeReport([makeRow({ projectId: 'prj/one two' })])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getByRole('link', { name: 'Apollo' })).toHaveAttribute(
      'href',
      '/app/projects/prj%2Fone%20two'
    )
  })

  it('renders on-track as a status badge, not a control', () => {
    render(
      <ProjectHealthTable
        report={makeReport([makeRow({ health: 'on-track' })])}
        projectHrefBase="/app/projects"
      />
    )

    const badge = screen.getByText('On track')
    expect(badge).toHaveClass('text-success')
    expect(badge.closest('a, button')).toBeNull()
  })

  it('renders at-risk and off-track tones', () => {
    render(
      <ProjectHealthTable
        report={makeReport([
          makeRow({ projectId: 'prj_1', health: 'at-risk' }),
          makeRow({
            projectId: 'prj_2',
            name: 'Borealis',
            health: 'off-track',
          }),
        ])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getByText('At risk')).toHaveClass('text-warning')
    expect(screen.getByText('Off track')).toHaveClass('text-destructive')
  })

  it('renders an unknown health as a neutral badge', () => {
    render(
      <ProjectHealthTable
        report={makeReport([makeRow({ health: 'unknown' })])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getByText('Unknown')).toHaveClass('text-secondary-foreground')
  })

  it('renders progress and budget consumption percentages', () => {
    render(
      <ProjectHealthTable
        report={makeReport([
          makeRow({ progressPercent: 42, budgetConsumedPercent: 85 }),
        ])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('renders an em dash for missing progress and budget', () => {
    render(
      <ProjectHealthTable
        report={makeReport([
          makeRow({ progressPercent: null, budgetConsumedPercent: null }),
        ])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('flags overdue and over-budget rows', () => {
    render(
      <ProjectHealthTable
        report={makeReport([
          makeRow({ overdue: 3, budgetConsumedPercent: 120 }),
        ])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getByText('3')).toHaveClass('text-destructive')
    expect(screen.getByText('120%')).toHaveClass('text-destructive')
  })

  it('renders a short empty state', () => {
    render(
      <ProjectHealthTable
        report={makeReport([])}
        projectHrefBase="/app/projects"
      />
    )

    expect(screen.getByText('No projects to report')).toBeInTheDocument()
  })
})
