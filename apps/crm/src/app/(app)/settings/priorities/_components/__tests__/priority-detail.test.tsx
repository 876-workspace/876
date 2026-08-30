// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { RequestPriority } from '@/types/crm'
import { PriorityDetail } from '../priority-detail'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  onClose: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    requestPriorities: {
      update: mocks.update,
    },
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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

describe('PriorityDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: aPriority(), error: null })
  })

  it('renders priority header and form values', () => {
    render(<PriorityDetail priority={aPriority()} onClose={mocks.onClose} />)

    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Name')).toHaveValue('Critical')
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Urgent issues requiring immediate action'
    )
    expect(screen.getByRole('radio', { name: 'Red' })).toBeChecked()
    expect(screen.getByText('pri_1')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<PriorityDetail priority={aPriority()} onClose={mocks.onClose} />)

    fireEvent.click(screen.getByLabelText('Close priority details'))
    expect(mocks.onClose).toHaveBeenCalledTimes(1)
  })

  it('allows updating priority fields and saving', async () => {
    render(<PriorityDetail priority={aPriority()} onClose={mocks.onClose} />)

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Critical Updated' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mocks.update).toHaveBeenCalledWith('pri_1', {
      name: 'Critical Updated',
      description: 'Urgent issues requiring immediate action',
      color: 'red',
      weight: 100,
      sortOrder: 10,
      isDefault: false,
      isActive: true,
    })
  })

  it('allows archiving and restoring non-default priorities', async () => {
    render(<PriorityDetail priority={aPriority()} onClose={mocks.onClose} />)

    const archiveButton = screen.getByRole('button', { name: 'Archive' })
    fireEvent.click(archiveButton)

    expect(mocks.update).toHaveBeenCalledWith('pri_1', {
      isActive: false,
    })
  })
})
