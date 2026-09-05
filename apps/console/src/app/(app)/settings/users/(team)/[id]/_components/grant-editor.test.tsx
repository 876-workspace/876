/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TeamAffiliation, TeamGrantStatus } from '@/types/team'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  update: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: { team: { update: mocks.update } },
}))

import { GrantEditor } from './grant-editor'

type EditorOptions = {
  canUpdate?: boolean
  canSuspend?: boolean
  viewerRole?: string | null
  initial?: Partial<{
    roleName: string
    status: TeamGrantStatus
    affiliation: TeamAffiliation
    title: string | null
    expiresAt: number | null
    justification: string | null
  }>
}

function renderEditor({
  canUpdate = true,
  canSuspend = true,
  viewerRole = 'super-admin',
  initial = {},
}: EditorOptions = {}) {
  render(
    <GrantEditor
      memberId="user_123"
      canUpdate={canUpdate}
      canSuspend={canSuspend}
      viewerRole={viewerRole}
      initial={{
        roleName: 'admin',
        status: 'active',
        affiliation: 'contractor',
        title: 'Consultant',
        expiresAt: 1_900_000_000,
        justification: 'Release support',
        ...initial,
      }}
    />
  )
}

async function choose(label: string, option: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(screen.getByRole('option', { name: option }))
}

describe('GrantEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({
      data: { userId: 'user_123' },
      error: null,
    })
  })

  it('reveals the required grant details when affiliation changes to contractor', async () => {
    renderEditor({
      initial: {
        affiliation: 'staff',
        title: null,
        expiresAt: null,
        justification: null,
      },
    })

    expect(screen.queryByLabelText('Access expires')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Justification')).not.toBeInTheDocument()

    await choose('Affiliation', 'Contractor')

    expect(screen.getByLabelText('Access expires')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Justification')).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('hides grant details and clears them explicitly when affiliation changes to staff', async () => {
    const user = userEvent.setup()
    renderEditor()

    await choose('Affiliation', 'Staff')

    expect(screen.queryByLabelText('Access expires')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Justification')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save access' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('user_123', {
      affiliation: 'staff',
      title: null,
      expiresAt: null,
      justification: null,
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('sends only changed grant fields through the typed team client', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Senior consultant')
    await user.click(screen.getByRole('button', { name: 'Save access' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('user_123', {
      title: 'Senior consultant',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('does not update the grant when no values have changed', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Save access' }))

    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('keeps the editable form mounted after a failed update', async () => {
    const user = userEvent.setup()
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'team/last-super-admin', message: 'Protected grant.' },
    })
    renderEditor()

    await user.clear(screen.getByLabelText('Justification'))
    await user.type(
      screen.getByLabelText('Justification'),
      'Extended release support'
    )
    await user.click(screen.getByRole('button', { name: 'Save access' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Protected grant.'
    )
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('user_123', {
      justification: 'Extended release support',
    })
    expect(screen.getByLabelText('Justification')).toHaveValue(
      'Extended release support'
    )
    await waitFor(() => {
      expect(screen.getByLabelText('Justification')).not.toBeDisabled()
      expect(screen.getByRole('button', { name: 'Save access' })).toBeEnabled()
    })
  })

  it('disables grant controls without team update permission', () => {
    renderEditor({ canUpdate: false, canSuspend: true })

    expect(screen.getByRole('combobox', { name: 'Role' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Affiliation' })).toBeDisabled()
    expect(screen.getByLabelText('Access expires')).toBeDisabled()
    expect(screen.getByLabelText('Title')).toBeDisabled()
    expect(screen.getByLabelText('Justification')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save access' })).toBeEnabled()
    expect(
      screen.queryByText(
        'You do not have permission to edit this access grant.'
      )
    ).not.toBeInTheDocument()
  })

  it('disables the status control without team suspend permission', () => {
    renderEditor({ canUpdate: true, canSuspend: false })

    expect(screen.getByRole('combobox', { name: 'Status' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeEnabled()
    expect(screen.getByRole('combobox', { name: 'Affiliation' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save access' })).toBeEnabled()
    expect(
      screen.queryByText(
        'You do not have permission to edit this access grant.'
      )
    ).not.toBeInTheDocument()
  })

  it('renders no permission fallback when the viewer cannot update or suspend', () => {
    renderEditor({ canUpdate: false, canSuspend: false })

    expect(
      screen.queryByRole('button', { name: 'Save access' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'You do not have permission to edit this access grant.'
      )
    ).not.toBeInTheDocument()
  })

  it('omits super-admin from the role options for a non-super-admin viewer', async () => {
    renderEditor({ viewerRole: 'admin' })

    await choose('Role', 'Staff')

    expect(
      screen.queryByRole('option', { name: 'Super Admin' })
    ).not.toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
