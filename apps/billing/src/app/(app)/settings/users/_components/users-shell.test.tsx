/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ segments: ['member_123'] }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/users',
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegments: () => navigation.segments,
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { UsersShell } from './users-shell'

describe('UsersShell', () => {
  it('keeps Add available while a member detail is open', () => {
    render(
      <UsersShell canInvite list={null}>
        detail
      </UsersShell>
    )

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/settings/users/invite'
    )
  })
})
