import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const { searchParamsRef } = vi.hoisted(() => ({
  searchParamsRef: { current: new URLSearchParams() },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsRef.current,
}))

import {
  WorkspaceSwitchers,
  type WorkspaceSwitchersProps,
} from './workspace-switchers'

const defaultProps: WorkspaceSwitchersProps = {
  orgSlug: 'acme',
  orgName: 'Acme Corp',
  workspaceKey: 'crm',
  workspaceLabel: '876 CRM',
  orgs: [
    { slug: 'acme', name: 'Acme Corp' },
    { slug: 'globex', name: 'Globex Corporation' },
    { slug: 'initech', name: 'Initech LLC' },
  ],
  apps: [
    { key: 'crm', label: '876 CRM', iconKey: 'requests' },
    { key: 'billing', label: '876 Billing', iconKey: 'billing' },
  ],
}

describe('WorkspaceSwitchers', () => {
  beforeEach(() => {
    searchParamsRef.current = new URLSearchParams()
  })

  it('renders the organization name in the org trigger', () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    const trigger = screen.getByRole('button', { name: 'Switch organization' })
    expect(trigger).toHaveTextContent('Acme Corp')
  })

  it('renders the workspace label in the app trigger', () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    const trigger = screen.getByRole('button', { name: 'Switch app' })
    expect(trigger).toHaveTextContent('876 CRM')
  })

  it('the return link defaults to /orgs/acme labelled with the org name when there is no from', () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    const returnLink = screen.getByRole('link', { name: 'Back to Acme Corp' })
    expect(returnLink).toHaveAttribute('href', '/orgs/acme')
    expect(returnLink).toHaveTextContent('Acme Corp')
  })

  it('the return link honours a valid from of /workspace/acme and reads All workspaces', () => {
    searchParamsRef.current = new URLSearchParams('from=/workspace/acme')
    render(<WorkspaceSwitchers {...defaultProps} />)

    const returnLink = screen.getByRole('link', {
      name: 'Back to All workspaces',
    })
    expect(returnLink).toHaveAttribute('href', '/workspace/acme')
    expect(returnLink).toHaveTextContent('All workspaces')
  })

  it('a hostile from of //evil.example falls back to /orgs/acme', () => {
    searchParamsRef.current = new URLSearchParams('from=//evil.example')
    render(<WorkspaceSwitchers {...defaultProps} />)

    const returnLink = screen.getByRole('link', { name: 'Back to Acme Corp' })
    expect(returnLink).toHaveAttribute('href', '/orgs/acme')
  })

  it('opening the org switcher lists every supplied organization', async () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch organization' }))

    expect(await screen.findByText('Organizations')).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Acme Corp' })).toBeVisible()
    expect(
      screen.getByRole('menuitem', { name: 'Globex Corporation' })
    ).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Initech LLC' })).toBeVisible()
  })

  it('an org switcher entry links to the same product under the other org (/workspace/globex/crm)', async () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch organization' }))

    const globexItem = await screen.findByRole('menuitem', {
      name: 'Globex Corporation',
    })
    expect(globexItem).toHaveAttribute('href', '/workspace/globex/crm')
  })

  it('the current organization is marked aria-current="page"', async () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch organization' }))

    const currentOrg = await screen.findByRole('menuitem', {
      name: 'Acme Corp',
    })
    expect(currentOrg).toHaveAttribute('aria-current', 'page')

    const otherOrg = screen.getByRole('menuitem', {
      name: 'Globex Corporation',
    })
    expect(otherOrg).not.toHaveAttribute('aria-current')
  })

  it('opening the app switcher lists every supplied app, each linking to /workspace/acme/<key>', async () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch app' }))

    const crmItem = await screen.findByRole('menuitem', { name: '876 CRM' })
    const billingItem = screen.getByRole('menuitem', { name: '876 Billing' })

    expect(crmItem).toHaveAttribute('href', '/workspace/acme/crm')
    expect(billingItem).toHaveAttribute('href', '/workspace/acme/billing')
  })

  it('the app switcher still renders its trigger and the All workspaces item when apps is empty', async () => {
    render(<WorkspaceSwitchers {...defaultProps} apps={[]} />)

    const trigger = screen.getByRole('button', { name: 'Switch app' })
    expect(trigger).toHaveTextContent('876 CRM')

    fireEvent.click(trigger)

    const allWorkspacesItem = await screen.findByRole('menuitem', {
      name: 'All workspaces',
    })
    expect(allWorkspacesItem).toHaveAttribute('href', '/workspace/acme')
    expect(screen.queryByText('Apps')).not.toBeInTheDocument()
  })

  it('marks the current workspace as aria-current="page" in the app switcher', async () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch app' }))

    const currentApp = await screen.findByRole('menuitem', { name: '876 CRM' })
    expect(currentApp).toHaveAttribute('aria-current', 'page')

    const otherApp = screen.getByRole('menuitem', { name: '876 Billing' })
    expect(otherApp).not.toHaveAttribute('aria-current')
  })

  it('renders Browse all organizations link pointing to /orgs in the org switcher', async () => {
    render(<WorkspaceSwitchers {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch organization' }))

    const browseItem = await screen.findByRole('menuitem', {
      name: 'Browse all organizations',
    })
    expect(browseItem).toHaveAttribute('href', '/orgs')
  })
})
