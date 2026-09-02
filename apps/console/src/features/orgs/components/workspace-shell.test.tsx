/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@876/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
}))

vi.mock('./workspace-icon', () => ({
  WorkspaceIcon: () => <span data-testid="workspace-icon" />,
}))

vi.mock('./workspace-nav', () => ({
  WorkspaceNav: ({ collapsed }: { collapsed?: boolean }) => (
    <nav data-collapsed={collapsed ? 'true' : 'false'}>
      Workspace navigation
    </nav>
  ),
}))

import { workspaceSectionLinks, APP_WORKSPACES } from '../app-workspaces'
import { WorkspaceShell } from './workspace-shell'

const crmWorkspace = APP_WORKSPACES.find(
  (workspace) => workspace.key === 'crm'
)!

describe('WorkspaceShell', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps Console workspace navigation as a floating collapsed rail by default', () => {
    render(
      <WorkspaceShell
        workspace={crmWorkspace}
        orgSlug="test-org"
        orgName="Test Org"
        links={workspaceSectionLinks('test-org', crmWorkspace)}
      >
        <div>CRM surface</div>
      </WorkspaceShell>
    )

    expect(
      screen.getByRole('button', { name: 'Expand 876 CRM sidebar' })
    ).toBeVisible()
    expect(screen.getByText('CRM surface')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Collapse to floating rail' })
    ).toBeNull()
  })

  it('expands and collapses without replacing the hosted product surface', () => {
    render(
      <WorkspaceShell
        workspace={crmWorkspace}
        orgSlug="test-org"
        orgName="Test Org"
        links={workspaceSectionLinks('test-org', crmWorkspace)}
      >
        <div>CRM surface</div>
      </WorkspaceShell>
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Expand 876 CRM sidebar' })
    )

    expect(
      screen.getByRole('button', { name: 'Collapse to floating rail' })
    ).toBeVisible()
    expect(screen.getByText('CRM surface')).toBeVisible()

    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse to floating rail' })
    )

    expect(
      screen.getByRole('button', { name: 'Expand 876 CRM sidebar' })
    ).toBeVisible()
    expect(screen.getByText('CRM surface')).toBeVisible()
  })
})
