import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MemberCard } from './_components/member-card'
import { MemberHeaderData } from './_components/member-header-data'
import MemberLayout from './layout'

const mocks = vi.hoisted(() => ({
  requireContext: vi.fn(),
  loadMember: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/lib/auth/require-projects-context', () => ({
  requireProjectsContext: mocks.requireContext,
}))
vi.mock('../_data', () => ({ loadMember: mocks.loadMember }))

describe('MemberLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the detail card shell without resolving member data', async () => {
    const element = await MemberLayout({
      children: <p>Body</p>,
      params: Promise.resolve({ membershipId: 'mem_1' }),
    })

    expect(element.type).toBe(MemberCard)
    expect(mocks.requireContext).not.toHaveBeenCalled()
    expect(mocks.loadMember).not.toHaveBeenCalled()
  })

  it('calls notFound when the resolved membership does not exist', async () => {
    mocks.requireContext.mockResolvedValue({ orgId: 'org_1' })
    mocks.loadMember.mockResolvedValue({ member: null, error: null })

    await expect(MemberHeaderData({ membershipId: 'missing' })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    )
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })

  it('does not treat a roster failure as a missing membership', async () => {
    mocks.requireContext.mockResolvedValue({ orgId: 'org_1' })
    mocks.loadMember.mockResolvedValue({
      member: null,
      error: { code: 'core/unavailable', message: 'Unavailable.' },
    })

    const element = await MemberHeaderData({ membershipId: 'mem_1' })

    expect(element.type).not.toBe(MemberCard)
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
})
