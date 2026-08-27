import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { DirectoryMember } from '../types'

import { MemberPicker } from './member-picker'

function createMembers(): DirectoryMember[] {
  return [
    {
      userId: 'user_althea_123',
      name: 'Althea Morgan',
      email: 'althea@island.test',
      avatar: null,
    },
    {
      userId: 'user_dario_456',
      name: 'Dario Bennett',
      email: 'dario@island.test',
      avatar: 'https://images.test/dario.png',
    },
    {
      userId: 'user_nia_789',
      name: 'Nia Campbell',
      email: 'nia@island.test',
      avatar: null,
    },
  ]
}

async function openPicker() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Choose member' }))
  return user
}

describe('MemberPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders every member in the open picker', async () => {
    render(
      <MemberPicker
        members={createMembers()}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )

    await openPicker()

    expect(screen.getByText('Althea Morgan')).toBeInTheDocument()
    expect(screen.getByText('Dario Bennett')).toBeInTheDocument()
    expect(screen.getByText('Nia Campbell')).toBeInTheDocument()
    expect(screen.getByText('althea@island.test')).toBeInTheDocument()
    expect(screen.getByText('dario@island.test')).toBeInTheDocument()
    expect(screen.getByText('nia@island.test')).toBeInTheDocument()
  })

  it('filters members immediately as the user types', async () => {
    render(
      <MemberPicker
        members={createMembers()}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )
    const user = await openPicker()

    await user.type(screen.getByPlaceholderText('Choose member'), 'dario')

    expect(screen.getByText('Dario Bennett')).toBeInTheDocument()
    expect(screen.queryByText('Althea Morgan')).not.toBeInTheDocument()
    expect(screen.queryByText('Nia Campbell')).not.toBeInTheDocument()
  })

  it('excludes already-added user ids', async () => {
    render(
      <MemberPicker
        members={createMembers()}
        value={null}
        onSelect={vi.fn()}
        exclude={['user_dario_456']}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )

    await openPicker()

    expect(screen.queryByText('Dario Bennett')).not.toBeInTheDocument()
    expect(screen.getByText('Althea Morgan')).toBeInTheDocument()
    expect(screen.getByText('Nia Campbell')).toBeInTheDocument()
  })

  it('calls onSelect with the exact selected user id', async () => {
    const onSelect = vi.fn()
    render(
      <MemberPicker
        members={createMembers()}
        value={null}
        onSelect={onSelect}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )
    const user = await openPicker()

    await user.click(screen.getByText('Nia Campbell'))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('user_nia_789')
  })

  it('renders Unassigned only when allowUnassigned is enabled', async () => {
    const { rerender } = render(
      <MemberPicker
        members={createMembers()}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )
    const user = await openPicker()
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Choose member' }))

    rerender(
      <MemberPicker
        members={createMembers()}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
        allowUnassigned
      />
    )
    await user.click(screen.getByRole('button', { name: 'Choose member' }))

    expect(
      screen.getByRole('option', { name: 'Unassigned' })
    ).toBeInTheDocument()
  })

  it('shows the empty label when nothing matches', async () => {
    render(
      <MemberPicker
        members={createMembers()}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )
    const user = await openPicker()

    await user.type(screen.getByPlaceholderText('Choose member'), 'zzzz')

    expect(screen.getByText('No members found')).toBeInTheDocument()
    expect(screen.queryByText('Althea Morgan')).not.toBeInTheDocument()
    expect(screen.queryByText('Dario Bennett')).not.toBeInTheDocument()
    expect(screen.queryByText('Nia Campbell')).not.toBeInTheDocument()
  })
})
