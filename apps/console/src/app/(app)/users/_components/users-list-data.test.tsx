// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  search: vi.fn(),
  listAppsByUsers: vi.fn(),
}))

vi.mock('@/lib/services/platform', () => ({
  platform: { users: mocks },
}))

vi.mock('./users-list', () => ({
  UsersList: (props: { users: { id: string }[] }) => (
    <div data-testid="users-list">{props.users.map((user) => user.id)}</div>
  ),
}))

import { UsersListData } from './users-list-data'

const user = { id: 'user_1', object: 'user' }

function successfulList() {
  mocks.list.mockResolvedValue({ data: { data: [user], has_more: true } })
  mocks.listAppsByUsers.mockResolvedValue({
    data: { data: [{ user_id: 'user_1', data: [] }] },
  })
}

describe('UsersListData', () => {
  it('threads status and forward cursor into the directory list', async () => {
    successfulList()
    render(await UsersListData({ after: 'user_10', status: 'active' }))
    expect(mocks.list).toHaveBeenCalledWith({
      limit: 25,
      startingAfter: 'user_10',
      endingBefore: undefined,
      status: 'active',
    })
  })

  it('threads the backward cursor into the directory list', async () => {
    successfulList()
    render(await UsersListData({ before: 'user_20' }))
    expect(mocks.list).toHaveBeenCalledWith({
      limit: 25,
      startingAfter: undefined,
      endingBefore: 'user_20',
      status: undefined,
    })
  })

  it('threads search and status into the search endpoint', async () => {
    mocks.search.mockResolvedValue({ data: { data: [user] } })
    mocks.listAppsByUsers.mockResolvedValue({ data: { data: [] } })
    render(await UsersListData({ q: 'ada', status: 'suspended' }))
    expect(mocks.search).toHaveBeenCalledWith({
      query: 'ada',
      limit: 50,
      status: 'suspended',
    })
  })

  it('loads memberships only after the primary list resolves', async () => {
    successfulList()
    render(await UsersListData({}))
    expect(mocks.list.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.listAppsByUsers.mock.invocationCallOrder[0]
    )
  })

  it('shows a visible notice when memberships cannot be enriched', async () => {
    mocks.list.mockResolvedValue({ data: { data: [user], has_more: false } })
    mocks.listAppsByUsers.mockResolvedValue({
      error: { message: 'membership service unavailable', code: 'unavailable' },
    })
    render(await UsersListData({}))
    expect(
      screen.getByText('User app memberships could not be loaded')
    ).toBeInTheDocument()
  })
})
