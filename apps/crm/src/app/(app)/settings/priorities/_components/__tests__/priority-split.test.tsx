// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { RequestPriority } from '@/types/crm'
import { PrioritySplit } from '../priority-split'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/client', () => ({
  client: {
    requestPriorities: {
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}))

function aPriority(overrides: Partial<RequestPriority> = {}): RequestPriority {
  return {
    object: 'request_priority',
    id: 'pri_1',
    tenantId: 'org_1',
    provisioningKey: null,
    name: 'Critical',
    slug: 'critical',
    description: 'Urgent issues requiring immediate action',
    color: 'red',
    icon: 'alert',
    weight: 100,
    sortOrder: 10,
    isDefault: false,
    isActive: true,
    createdBy: 'user_1',
    createdAt: 1788000000,
    updatedAt: 1788000000,
    ...overrides,
  }
}

const priorities: RequestPriority[] = [
  aPriority(),
  aPriority({
    id: 'pri_2',
    name: 'Standard',
    slug: 'standard',
    description: 'Normal business requests',
    color: 'blue',
    icon: 'tag',
    weight: 20,
    sortOrder: 20,
    isDefault: true,
    isActive: true,
  }),
]

describe('PrioritySplit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders priorities list in full table mode when no priority is selected', () => {
    render(<PrioritySplit priorities={priorities} selectedId={undefined} />)

    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.queryByLabelText('Close priority details')).toBeNull()
  })

  it('navigates to ?priority=<id> when a row is clicked in full table mode', () => {
    render(<PrioritySplit priorities={priorities} selectedId={undefined} />)

    fireEvent.click(screen.getByText('Critical'))
    expect(mocks.push).toHaveBeenCalledWith(
      '/settings/priorities?priority=pri_1'
    )
  })

  it('renders priority detail card to the right when a priority is selected', () => {
    render(<PrioritySplit priorities={priorities} selectedId="pri_1" />)

    expect(screen.getByLabelText('Close priority details')).toBeInTheDocument()
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0)
    expect(
      screen.getByText('Urgent issues requiring immediate action')
    ).toBeInTheDocument()
    expect(screen.getByText('pri_1')).toBeInTheDocument()
  })

  it('renders priority creation card to the right when selectedId="new"', () => {
    render(<PrioritySplit priorities={priorities} selectedId="new" />)

    expect(screen.getByLabelText('Close priority creation')).toBeInTheDocument()
    expect(screen.getByText('New priority')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('renders empty state when priorities list is empty', () => {
    render(<PrioritySplit priorities={[]} selectedId={undefined} />)

    expect(screen.getByText('No priorities yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })
})
