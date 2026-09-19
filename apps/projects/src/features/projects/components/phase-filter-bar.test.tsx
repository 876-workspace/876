/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Project } from '@876/projects/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PhaseFilterBar } from './phase-filter-bar'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    object: 'projects.project',
    id: 'prj_1',
    tenantId: 'tnt_1',
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
    position: 0,
    archivedAt: null,
    createdAt: 1,
    updatedAt: 1,
    memberCount: 1,
    customFields: [],
    ...overrides,
  }
}

function renderBar({
  project = '',
  status = 'all',
}: {
  project?: string
  status?: string
} = {}) {
  return render(
    <PhaseFilterBar
      projects={[makeProject()]}
      project={project}
      status={status}
    />
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PhaseFilterBar', () => {
  it('shows the current filters and no Apply button', () => {
    renderBar({ project: 'prj_1', status: 'open' })

    expect(screen.getByLabelText('Project')).toHaveValue('prj_1')
    expect(screen.getByLabelText('Status')).toHaveValue('open')
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull()
  })

  it('submits the form when the project filter changes', () => {
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit')
    renderBar()

    fireEvent.change(screen.getByLabelText('Project'), {
      target: { value: 'prj_1' },
    })

    expect(requestSubmit).toHaveBeenCalledTimes(1)
    expect(requestSubmit.mock.instances[0]).toBe(document.querySelector('form'))
  })

  it('submits the form when the status filter changes', () => {
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit')
    renderBar()

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'completed' },
    })

    expect(requestSubmit).toHaveBeenCalledTimes(1)
    expect(requestSubmit.mock.instances[0]).toBe(document.querySelector('form'))
  })

  it('submits the changed controls to the phases route', () => {
    renderBar({ project: 'prj_1' })

    expect(document.querySelector('form')).toHaveAttribute('action', '/phases')
    expect(
      screen.getByLabelText('Project').querySelector('option[value="prj_1"]')
    ).toHaveTextContent('Alpha Redesign')
  })

  it('offers Clear only while a filter is applied', () => {
    const { unmount } = renderBar()
    expect(screen.queryByRole('link', { name: 'Clear' })).toBeNull()
    unmount()

    renderBar({ project: 'prj_1' })
    expect(screen.getByRole('link', { name: 'Clear' })).toHaveAttribute(
      'href',
      '/phases'
    )
  })
})
