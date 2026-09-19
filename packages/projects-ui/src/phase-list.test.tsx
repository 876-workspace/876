// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MilestoneDetail, Project } from '@876/projects/contracts'

import { PhaseList } from './phase-list'

const PROJECT_ID = 'proj_alpha'
const PHASES_HREF = '/phases'
const TARGET_DATE = Date.UTC(2026, 2, 4) / 1000

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    object: 'projects.project',
    id: PROJECT_ID,
    tenantId: 'tenant_1',
    name: 'Alpha Redesign',
    key: 'ALP',
    slug: 'alpha-redesign',
    description: null,
    leadUserId: null,
    status: 'active',
    health: 'on-track',
    startDate: null,
    targetDate: null,
    nextIssueNumber: 1,
    customerId: null,
    defaultWorkItemTypeId: null,
    position: 1,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 3,
    customFields: [],
    ...overrides,
  }
}

function makePhase(overrides: Partial<MilestoneDetail> = {}): MilestoneDetail {
  return {
    object: 'projects.milestone',
    id: 'ms_1',
    tenantId: 'tenant_1',
    projectId: PROJECT_ID,
    key: 'PH-1',
    name: 'Discovery',
    description: null,
    status: 'open',
    startDate: null,
    targetDate: null,
    completedAt: null,
    position: 1,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ownerUserId: null,
    ...overrides,
  }
}

function renderList({
  phases = [makePhase()],
  projects = [makeProject()],
  ownerLabels = {},
}: {
  phases?: MilestoneDetail[]
  projects?: Project[]
  ownerLabels?: Record<string, string>
} = {}) {
  return render(
    <PhaseList
      phases={phases}
      projects={projects}
      ownerLabels={ownerLabels}
      phasesHref={PHASES_HREF}
    />
  )
}

function mobileList(container: HTMLElement): HTMLElement {
  const list = container.querySelector('ul')
  if (!list) throw new Error('Expected a mobile list')
  return list as HTMLElement
}

function mobileRows(container: HTMLElement): HTMLElement[] {
  return [...mobileList(container).querySelectorAll<HTMLElement>(':scope > li')]
}

function mobileMeta(row: HTMLElement): HTMLElement | null {
  return row.querySelector('[data-cell-content] > div > span')
}

describe('PhaseList', () => {
  afterEach(cleanup)

  it('renders a phone row per phase with the phase name as the title', () => {
    const { container } = renderList({
      phases: [
        makePhase({ id: 'ms_1', name: 'Discovery' }),
        makePhase({ id: 'ms_2', key: 'PH-2', name: 'Build' }),
      ],
    })

    const rows = mobileRows(container)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Discovery')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Build')).toBeInTheDocument()
  })

  it('shows the project name and status as the phone subtitle', () => {
    const { container } = renderList({
      phases: [makePhase({ status: 'completed' })],
    })

    const subtitle = mobileRows(container)[0].querySelector(
      '[data-cell-content] > p'
    )
    expect(subtitle?.textContent).toBe('Alpha Redesign · Completed')
  })

  it('shows the target date as the phone meta', () => {
    const { container } = renderList({
      phases: [makePhase({ targetDate: TARGET_DATE })],
    })

    expect(mobileMeta(mobileRows(container)[0])).toHaveTextContent(
      'Mar 4, 2026'
    )
  })

  it('leaves the phone meta empty when a phase has no target date', () => {
    const { container } = renderList({
      phases: [makePhase({ targetDate: null })],
    })

    expect(mobileMeta(mobileRows(container)[0])).toBeNull()
  })

  it('links the phone row to the phase detail page', () => {
    const { container } = renderList({
      phases: [makePhase({ id: 'ms_1', name: 'Discovery' })],
    })

    expect(
      within(mobileList(container)).getByRole('link', {
        name: 'View phase Discovery',
      })
    ).toHaveAttribute('href', `${PHASES_HREF}/ms_1`)
  })

  it('renders the empty state when the list is empty', () => {
    const { container } = renderList({ phases: [] })

    expect(mobileList(container).children).toHaveLength(1)
    expect(
      within(mobileList(container)).getByText('No phases yet.')
    ).toBeInTheDocument()
    expect(screen.getAllByText('No phases yet.')).toHaveLength(2)
  })

  it('still renders the desktop table with every phase row', () => {
    renderList({
      phases: [
        makePhase({ id: 'ms_1', name: 'Discovery' }),
        makePhase({
          id: 'ms_2',
          key: 'PH-2',
          name: 'Build',
          status: 'completed',
          ownerUserId: 'user_1',
          targetDate: TARGET_DATE,
        }),
      ],
      ownerLabels: { user_1: 'Ada Lovelace' },
    })

    const table = within(screen.getByRole('table'))
    expect(table.getAllByRole('row')).toHaveLength(3)
    expect(table.getByText('PH-1')).toBeInTheDocument()
    expect(table.getByText('PH-2')).toBeInTheDocument()
    expect(table.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(table.getByText('Unassigned')).toBeInTheDocument()
    expect(table.getByText('Completed')).toBeInTheDocument()
    expect(table.getAllByText('Alpha Redesign')).toHaveLength(2)
    expect(table.getByText('Mar 4, 2026')).toBeInTheDocument()
  })

  it('keeps the phase link on the desktop table row', () => {
    renderList({ phases: [makePhase({ id: 'ms_1', name: 'Discovery' })] })

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Discovery',
      })
    ).toHaveAttribute('href', `${PHASES_HREF}/ms_1`)
  })
})
