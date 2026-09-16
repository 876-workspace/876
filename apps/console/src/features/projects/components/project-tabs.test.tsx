// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects/projects/proj_test/gantt',
}))

import { ProjectTabs } from './project-tabs'

describe('ProjectTabs', () => {
  it('renders the nine record tabs against the host base', () => {
    render(<ProjectTabs base="/projects" projectId="proj_test" />)

    for (const label of [
      'Overview',
      'Activity',
      'Discussions',
      'Wiki',
      'Clients',
      'Gantt',
      'Time',
      'Finance',
      'Attachments',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('Gantt').closest('a')).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/gantt'
    )
    expect(screen.getByText('Attachments').closest('a')).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/attachments'
    )
  })

  it('links the collaboration tabs under the record', () => {
    render(<ProjectTabs base="/projects" projectId="proj_test" />)

    expect(screen.getByText('Activity').closest('a')).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/activity'
    )
    expect(screen.getByText('Discussions').closest('a')).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/discussions'
    )
    expect(screen.getByText('Wiki').closest('a')).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/wiki'
    )
    expect(screen.getByText('Clients').closest('a')).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/clients'
    )
  })

  it('encodes the project id and honors a workspace base', () => {
    render(
      <ProjectTabs base="/workspace/acme/projects" projectId="proj test" />
    )

    expect(screen.getByText('Overview').closest('a')).toHaveAttribute(
      'href',
      '/workspace/acme/projects/projects/proj%20test'
    )
    expect(screen.getByText('Activity').closest('a')).toHaveAttribute(
      'href',
      '/workspace/acme/projects/projects/proj%20test/activity'
    )
  })
})
