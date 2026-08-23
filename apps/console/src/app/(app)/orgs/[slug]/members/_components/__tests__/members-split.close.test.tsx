// @vitest-environment jsdom
import type { AdminOrgMember } from '@876/admin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MembersSplit } from '../members-split'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams('member=mem_1'),
  usePathname: () => '/orgs/test-org/members',
}))

function aMember(overrides: Partial<AdminOrgMember> = {}): AdminOrgMember {
  return {
    object: 'organization_member',
    id: 'mem_1',
    user_id: 'user_1',
    role: 'admin',
    role_id: null,
    status: 'active',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    avatar: null,
    created_at: 1700000000,
    ...overrides,
  }
}

function renderSelected() {
  return render(
    <MembersSplit
      members={[aMember()]}
      apps={<div>Apps Content</div>}
      selectedId="mem_1"
      basePath="/orgs/test-org/members"
    />
  )
}

describe('MembersSplit close animation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the panel mounted and does not navigate immediately on close click', () => {
    renderSelected()

    act(() => {
      screen.getByLabelText('Close member details').click()
    })

    expect(push).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Close member details')).toBeInTheDocument()
  })

  it('navigates to the list once the exit animation has run', () => {
    renderSelected()

    act(() => {
      screen.getByLabelText('Close member details').click()
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/orgs/test-org/members')
  })
})
