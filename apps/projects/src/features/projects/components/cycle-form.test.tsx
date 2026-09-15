import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/client/cycles', () => ({
  cyclesClient: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    assignIssues: vi.fn(),
    unassignIssue: vi.fn(),
  },
}))

const { CycleForm } = await import('./cycle-form')

describe('CycleForm', () => {
  it('renders cycle fields', () => {
    render(<CycleForm mode="create" projects={[]} />)

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Starts')).toBeInTheDocument()
    expect(screen.getByLabelText('Ends')).toBeInTheDocument()
  })

  it('uses bare verb labels', () => {
    render(<CycleForm mode="create" projects={[]} />)

    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })
})
