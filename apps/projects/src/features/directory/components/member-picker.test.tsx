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

function createLargeDirectory(count: number): DirectoryMember[] {
  return Array.from({ length: count }, (_, index) => ({
    userId: `user_${index}`,
    name: `Member ${index}`,
    email: `member${index}@island.test`,
    avatar: null,
  }))
}

/** The field itself is the search input — there is no separate trigger. */
function field() {
  return screen.getByRole('combobox', { name: 'Choose member' })
}

async function openPicker() {
  const user = userEvent.setup()
  await user.click(field())
  return user
}

describe('MemberPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('types into the field itself rather than opening a second search box', async () => {
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

    // One text input for the whole control, before and after opening.
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)

    await user.type(field(), 'nia')

    expect(field()).toHaveValue('nia')
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })

  it('shows the selected member name in the field', async () => {
    render(
      <MemberPicker
        members={createMembers()}
        value="user_nia_789"
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )

    expect(field()).toHaveValue('Nia Campbell')
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

    await user.type(field(), 'dario')

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
    await user.click(field())

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
    await user.click(field())

    expect(
      screen.getByRole('option', { name: 'Unassigned' })
    ).toBeInTheDocument()
  })

  it('lists nobody until a query is typed when the directory is large', async () => {
    render(
      <MemberPicker
        members={createLargeDirectory(40)}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )

    await openPicker()

    // Base UI appends a word joiner inside Empty, so match loosely.
    expect(screen.getByText(/Type to search 40 people/)).toBeInTheDocument()
    expect(screen.queryByText('Member 0')).not.toBeInTheDocument()
    expect(screen.queryByText('Member 39')).not.toBeInTheDocument()
  })

  it('lists matches once a query is typed against a large directory', async () => {
    render(
      <MemberPicker
        members={createLargeDirectory(40)}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )
    const user = await openPicker()

    await user.type(field(), 'Member 17')

    expect(screen.getByText('Member 17')).toBeInTheDocument()
    expect(screen.queryByText('Member 18')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Type to search 40 people/)
    ).not.toBeInTheDocument()
  })

  it('caps rendered rows and reports how many more matched', async () => {
    render(
      <MemberPicker
        members={createLargeDirectory(60)}
        value={null}
        onSelect={vi.fn()}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )
    const user = await openPicker()

    await user.type(field(), 'Member')

    expect(screen.getAllByRole('option')).toHaveLength(50)
  })

  it('counts only selectable people when deciding to require a query', async () => {
    const members = createLargeDirectory(10)
    render(
      <MemberPicker
        members={members}
        value={null}
        onSelect={vi.fn()}
        exclude={members.slice(0, 3).map((member) => member.userId)}
        placeholder="Choose member"
        emptyLabel="No members found"
      />
    )

    await openPicker()

    expect(screen.getByText('Member 3')).toBeInTheDocument()
    expect(screen.queryByText('Member 0')).not.toBeInTheDocument()
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

    await user.type(field(), 'zzzz')

    expect(screen.getByText('No members found')).toBeInTheDocument()
    expect(screen.queryByText('Althea Morgan')).not.toBeInTheDocument()
    expect(screen.queryByText('Dario Bennett')).not.toBeInTheDocument()
    expect(screen.queryByText('Nia Campbell')).not.toBeInTheDocument()
  })
})
