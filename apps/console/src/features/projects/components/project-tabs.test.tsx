// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects/projects/proj_test/gantt',
}))

import { ProjectTabs } from './project-tabs'

describe('ProjectTabs', () => {
  it('renders the five record tabs against the host base', () => {
    render(<ProjectTabs base="/projects" projectId="proj_test" />)

    for (const label of [
      'Overview',
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

  it('encodes the project id and honors a workspace base', () => {
    render(
      <ProjectTabs base="/workspace/acme/projects" projectId="proj test" />
    )

    expect(screen.getByText('Overview').closest('a')).toHaveAttribute(
      'href',
      '/workspace/acme/projects/projects/proj%20test'
    )
  })
})
