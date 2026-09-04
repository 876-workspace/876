import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NavGroupDefinition } from '@876/core/access'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/issues',
}))

import { MobileNav } from './mobile-nav'

const navigation: NavGroupDefinition[] = [
  {
    key: 'main',
    label: 'Main',
    entries: [
      { key: 'dashboard', title: 'Dashboard', href: '/', icon: 'dashboard' },
      { key: 'issues', title: 'Issues', href: '/issues', icon: 'issues' },
    ],
  },
  {
    key: 'manage',
    label: 'Manage',
    entries: [
      {
        key: 'labels',
        title: 'Labels',
        href: '/labels',
        icon: 'labels',
      },
      {
        key: 'mystery',
        title: 'Mystery',
        href: '/mystery',
        icon: 'no-such-icon',
      },
    ],
  },
]

const baseProps = {
  apps: [],
  currentOrg: { id: 'org_1', name: 'Acme', slug: 'acme' },
  navigation,
  orgs: [],
}

const allFeatures = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
}

async function openSheet(props = {}) {
  const user = userEvent.setup()
  render(<MobileNav {...baseProps} uiFeatures={allFeatures} {...props} />)
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MobileNav trigger', () => {
  it('opens the navigation sheet from the header control', async () => {
    await openSheet()

    expect(
      await screen.findByRole('navigation', { name: 'Projects navigation' })
    ).toBeInTheDocument()
  })

  it('keeps the sheet closed before the control is pressed', () => {
    render(<MobileNav {...baseProps} uiFeatures={allFeatures} />)

    expect(
      screen.queryByRole('navigation', { name: 'Projects navigation' })
    ).not.toBeInTheDocument()
  })
})

describe('MobileNav entries', () => {
  it('marks the current path entry as the current page', async () => {
    await openSheet()

    const sheet = await screen.findByRole('navigation', {
      name: 'Projects navigation',
    })
    const current = within(sheet).getByRole('link', { name: 'Issues' })

    expect(current).toHaveAttribute('aria-current', 'page')
    expect(
      within(sheet).getByRole('link', { name: 'Dashboard' })
    ).not.toHaveAttribute('aria-current')
  })

  it('falls back to the settings icon for an unknown icon key', async () => {
    await openSheet()

    const sheet = await screen.findByRole('navigation', {
      name: 'Projects navigation',
    })

    expect(
      within(sheet).getByRole('link', { name: 'Mystery' })
    ).toBeInTheDocument()
  })

  it('closes the sheet when a destination is chosen', async () => {
    const user = await openSheet()

    const sheet = await screen.findByRole('navigation', {
      name: 'Projects navigation',
    })
    await user.click(within(sheet).getByRole('link', { name: 'Labels' }))

    expect(
      screen.queryByRole('navigation', { name: 'Projects navigation' })
    ).not.toBeInTheDocument()
  })

  it('renders the second group after the first group in document order', async () => {
    await openSheet()

    const sheet = await screen.findByRole('navigation', {
      name: 'Projects navigation',
    })
    const issues = within(sheet).getByRole('link', { name: 'Issues' })
    const labels = within(sheet).getByRole('link', { name: 'Labels' })

    expect(issues.compareDocumentPosition(labels)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('points every entry at its configured href', async () => {
    await openSheet()

    const sheet = await screen.findByRole('navigation', {
      name: 'Projects navigation',
    })

    expect(within(sheet).getByRole('link', { name: 'Issues' })).toHaveAttribute(
      'href',
      '/issues'
    )
    expect(within(sheet).getByRole('link', { name: 'Labels' })).toHaveAttribute(
      'href',
      '/labels'
    )
  })
})

describe('MobileNav footer', () => {
  it('hides the footer when no footer feature is enabled', async () => {
    await openSheet()

    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('shows the organization switcher when enabled', async () => {
    const user = userEvent.setup()
    render(
      <MobileNav
        {...baseProps}
        uiFeatures={{ ...allFeatures, orgSwitcher: true }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))

    expect(await screen.findByText('Acme')).toBeInTheDocument()
  })
})
