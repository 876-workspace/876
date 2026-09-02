import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AppAccessPanel } from './app-access-panel'
import type { AccessAppEntry } from './types'

const viewer = {
  id: 'role_viewer',
  key: 'viewer',
  name: 'Viewer',
  description: null,
  permissions: ['reports.view'],
  isSystem: true,
  isDefault: true,
}

const editor = {
  id: 'role_editor',
  key: 'editor',
  name: 'Editor',
  description: null,
  permissions: ['reports.view', 'settings.edit'],
  isSystem: false,
  isDefault: false,
}

const catalog = [
  {
    key: 'reports.view',
    moduleKey: 'reports',
    moduleLabel: 'Reports',
    action: 'view',
    label: 'View reports',
    isDangerous: false,
  },
  {
    key: 'settings.edit',
    moduleKey: 'settings',
    moduleLabel: 'Settings',
    action: 'edit',
    label: 'Edit settings',
    isDangerous: true,
  },
]

function entry(overrides: Partial<AccessAppEntry> = {}): AccessAppEntry {
  return {
    assignmentId: 'assignment_1',
    appId: 'app_billing',
    appSlug: '876-billing',
    appName: 'Billing',
    entitled: true,
    assigned: true,
    status: 'active',
    role: viewer,
    roles: [viewer, editor],
    grants: [],
    denies: [],
    effectivePermissions: ['reports.view'],
    catalog,
    ...overrides,
  }
}

async function chooseRole(name: string, roleName: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name }))
  await user.click(await screen.findByRole('option', { name: roleName }))
}

describe('AppAccessPanel', () => {
  it('renders one section per entry ordered by app name', () => {
    render(
      <AppAccessPanel
        entries={[entry({ appId: 'app_crm', appName: 'CRM' }), entry()]}
      />
    )

    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Billing', 'CRM'])
  })

  it('renders the current role name for an assigned app', () => {
    render(<AppAccessPanel entries={[entry()]} />)

    expect(
      screen.getByRole('combobox', { name: 'Billing role' })
    ).toHaveTextContent('Viewer')
  })

  it('renders the No access state for an unassigned app', () => {
    render(
      <AppAccessPanel
        entries={[entry({ assigned: false, assignmentId: null, role: null })]}
      />
    )

    expect(screen.getAllByText('No access')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Assign' })).toBeVisible()
  })

  it('calls onRoleChange with the entry and selected role id', async () => {
    const value = entry()
    const onRoleChange = vi.fn().mockResolvedValue(null)
    render(<AppAccessPanel entries={[value]} onRoleChange={onRoleChange} />)

    await chooseRole('Billing role', 'Editor')

    expect(onRoleChange).toHaveBeenCalledTimes(1)
    expect(onRoleChange).toHaveBeenCalledWith(value, 'role_editor')
  })

  it('does not call onRoleChange when readOnly', async () => {
    const onRoleChange = vi.fn().mockResolvedValue(null)
    render(
      <AppAccessPanel
        entries={[entry()]}
        onRoleChange={onRoleChange}
        readOnly
      />
    )

    expect(
      screen.getByRole('combobox', { name: 'Billing role' })
    ).toBeDisabled()
    expect(onRoleChange).not.toHaveBeenCalled()
  })

  it('disables the role picker while a change is in flight', async () => {
    let resolveChange: (value: string | null) => void = () => undefined
    const onRoleChange = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveChange = resolve
        })
    )
    render(<AppAccessPanel entries={[entry()]} onRoleChange={onRoleChange} />)

    await chooseRole('Billing role', 'Editor')

    expect(
      screen.getByRole('combobox', { name: 'Billing role' })
    ).toBeDisabled()
    resolveChange(null)
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Billing role' })
      ).not.toBeDisabled()
    )
  })

  it('renders an onRoleChange error inline', async () => {
    render(
      <AppAccessPanel
        entries={[entry()]}
        onRoleChange={vi.fn().mockResolvedValue('Role update failed')}
      />
    )

    await chooseRole('Billing role', 'Editor')

    expect(await screen.findByText('Role update failed')).toBeVisible()
  })

  it('keeps the panel and values mounted after a role error', async () => {
    render(
      <AppAccessPanel
        entries={[entry()]}
        onRoleChange={vi.fn().mockResolvedValue('Role update failed')}
      />
    )

    await chooseRole('Billing role', 'Editor')

    expect(
      screen.getByRole('heading', { level: 3, name: 'Billing' })
    ).toBeVisible()
    expect(
      screen.getByRole('combobox', { name: 'Billing role' })
    ).toHaveTextContent('Editor')
  })

  it('keeps a failed first assignment selected and retryable', async () => {
    const onRoleChange = vi.fn().mockResolvedValue('Assignment failed')
    render(
      <AppAccessPanel
        entries={[entry({ assigned: false, assignmentId: null, role: null })]}
        onRoleChange={onRoleChange}
      />
    )

    await chooseRole('Billing role', 'Editor')
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Assign' }))

    expect(await screen.findByText('Assignment failed')).toBeVisible()
    expect(
      screen.getByRole('combobox', { name: 'Billing role' })
    ).toHaveTextContent('Editor')
    expect(screen.getByRole('button', { name: 'Assign' })).toBeEnabled()
  })

  it('waits for the server assignment id before enabling overrides', async () => {
    render(
      <AppAccessPanel
        entries={[entry({ assigned: false, assignmentId: null, role: null })]}
        onRoleChange={vi.fn().mockResolvedValue(null)}
        onOverrideChange={vi.fn().mockResolvedValue(null)}
      />
    )

    await chooseRole('Billing role', 'Editor')
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Assign' }))

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Edit settings' })
      ).toHaveAttribute('aria-disabled', 'true')
    )
  })

  it('adds a missing role permission to grants only', async () => {
    const value = entry()
    const onOverrideChange = vi.fn().mockResolvedValue(null)
    render(
      <AppAccessPanel entries={[value]} onOverrideChange={onOverrideChange} />
    )

    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'Edit settings' }))

    expect(onOverrideChange).toHaveBeenCalledTimes(1)
    expect(onOverrideChange).toHaveBeenCalledWith(value, {
      grants: ['settings.edit'],
      denies: [],
    })
  })

  it('adds a role permission denial to denies only', async () => {
    const value = entry()
    const onOverrideChange = vi.fn().mockResolvedValue(null)
    render(
      <AppAccessPanel entries={[value]} onOverrideChange={onOverrideChange} />
    )

    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'View reports' }))

    expect(onOverrideChange).toHaveBeenCalledWith(value, {
      grants: [],
      denies: ['reports.view'],
    })
  })

  it('removes a grant without changing denies', async () => {
    const value = entry({ grants: ['settings.edit'], denies: ['reports.view'] })
    const onOverrideChange = vi.fn().mockResolvedValue(null)
    render(
      <AppAccessPanel entries={[value]} onOverrideChange={onOverrideChange} />
    )

    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'Edit settings' }))

    expect(onOverrideChange).toHaveBeenCalledWith(value, {
      grants: [],
      denies: ['reports.view'],
    })
  })

  it('never sends a key in both grants and denies', async () => {
    const value = entry({
      grants: ['settings.edit'],
      denies: ['settings.edit'],
    })
    const onOverrideChange = vi.fn().mockResolvedValue(null)
    render(
      <AppAccessPanel entries={[value]} onOverrideChange={onOverrideChange} />
    )

    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'Edit settings' }))

    expect(onOverrideChange).toHaveBeenCalledWith(value, {
      grants: [],
      denies: [],
    })
  })

  it('does not call onOverrideChange when readOnly', () => {
    const onOverrideChange = vi.fn().mockResolvedValue(null)
    render(
      <AppAccessPanel
        entries={[entry()]}
        onOverrideChange={onOverrideChange}
        readOnly
      />
    )

    expect(
      screen.getByRole('checkbox', { name: 'View reports' })
    ).toHaveAttribute('aria-disabled', 'true')
    expect(onOverrideChange).not.toHaveBeenCalled()
  })

  it('disables the app mutation controls while an override is in flight', async () => {
    let resolveChange: (value: string | null) => void = () => undefined
    const onOverrideChange = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveChange = resolve
        })
    )
    render(
      <AppAccessPanel
        entries={[entry()]}
        onRoleChange={vi.fn().mockResolvedValue(null)}
        onOverrideChange={onOverrideChange}
      />
    )

    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'Edit settings' }))

    expect(
      screen.getByRole('combobox', { name: 'Billing role' })
    ).toBeDisabled()
    expect(
      screen.getByRole('checkbox', { name: 'View reports' })
    ).toHaveAttribute('aria-disabled', 'true')
    resolveChange(null)
  })

  it('groups permissions by module in catalog module order', () => {
    render(<AppAccessPanel entries={[entry()]} />)

    expect(
      screen
        .getAllByRole('heading', { level: 5 })
        .map((heading) => heading.textContent)
    ).toEqual(['Reports', 'Settings'])
  })

  it('marks a dangerous permission', () => {
    render(<AppAccessPanel entries={[entry()]} />)

    expect(screen.getByText('Dangerous')).toBeVisible()
  })

  it('renders an empty state for no entries', () => {
    render(<AppAccessPanel entries={[]} />)

    expect(screen.getByText('No entitled apps')).toBeVisible()
  })

  it('renders an empty-catalog entry without a permission matrix', () => {
    render(<AppAccessPanel entries={[entry({ catalog: [] })]} />)

    expect(
      screen.getByRole('heading', { level: 3, name: 'Billing' })
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { level: 4, name: 'Permissions' })
    ).not.toBeInTheDocument()
  })

  it('does not render an unentitled entry', () => {
    render(<AppAccessPanel entries={[entry({ entitled: false })]} />)

    expect(screen.getByText('No entitled apps')).toBeVisible()
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Billing' })
    ).not.toBeInTheDocument()
  })

  it('replaces stale optimistic values when entries change identity', async () => {
    const value = entry()
    const { rerender } = render(
      <AppAccessPanel
        entries={[value]}
        onRoleChange={vi.fn().mockResolvedValue(null)}
      />
    )

    await chooseRole('Billing role', 'Editor')
    rerender(
      <AppAccessPanel
        entries={[[entry({ role: viewer })][0]]}
        onRoleChange={vi.fn().mockResolvedValue(null)}
      />
    )

    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Billing role' })
      ).toHaveTextContent('Viewer')
    )
  })

  it('does not render green classes on buttons', () => {
    const { container } = render(
      <AppAccessPanel
        entries={[entry({ assigned: false, assignmentId: null, role: null })]}
      />
    )

    expect(
      [...container.querySelectorAll('button')].map(
        (button) => button.className
      )
    ).not.toContainEqual(expect.stringMatching(/bg-green|text-green/))
  })
})
