/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CustomerBranchField } from './customer-branch-field'

const BRANCHES = [
  { id: 'br_kingston', name: 'Kingston' },
  { id: 'br_mobay', name: 'Montego Bay' },
]

describe('CustomerBranchField', () => {
  it('shows the selected branch name and not its ID', () => {
    render(
      <CustomerBranchField
        branches={BRANCHES}
        value="br_kingston"
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    const trigger = screen.getByRole('combobox', { name: 'Branch' })
    expect(trigger).toHaveTextContent('Kingston')
    expect(trigger).not.toHaveTextContent('br_kingston')
  })

  it('auto-selects the only branch and signals readiness', async () => {
    const onValueChange = vi.fn()
    const onBranchesReady = vi.fn()
    render(
      <CustomerBranchField
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        value=""
        onValueChange={onValueChange}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith('br_kingston')
    )
    expect(onBranchesReady).toHaveBeenCalled()
  })

  it('does not auto-select when multiple branches exist', () => {
    const onValueChange = vi.fn()
    render(
      <CustomerBranchField
        branches={BRANCHES}
        value=""
        onValueChange={onValueChange}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent(
      'Select branch'
    )
  })

  it('does not auto-select when a value is already chosen', () => {
    const onValueChange = vi.fn()
    render(
      <CustomerBranchField
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        value="br_kingston"
        onValueChange={onValueChange}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('calls onValueChange when the user picks a different branch', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <CustomerBranchField
        branches={BRANCHES}
        value="br_kingston"
        onValueChange={onValueChange}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    await user.click(screen.getByRole('combobox', { name: 'Branch' }))
    await user.click(await screen.findByRole('option', { name: 'Montego Bay' }))
    expect(onValueChange).toHaveBeenCalledWith('br_mobay')
  })

  it('disables the control when there are no branches', () => {
    render(
      <CustomerBranchField
        branches={[]}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeDisabled()
  })

  it('disables the control when the disabled prop is true', () => {
    render(
      <CustomerBranchField
        branches={BRANCHES}
        value="br_kingston"
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled
      />
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeDisabled()
  })

  it('marks the branch as required', () => {
    render(
      <CustomerBranchField
        branches={BRANCHES}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeRequired()
  })

  it('shows a skeleton while branches are streaming', () => {
    const never = new Promise<never>(() => {})
    render(
      <CustomerBranchField
        branches={never as unknown as Promise<typeof BRANCHES>}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByLabelText('Loading branches')).toBeVisible()
  })

  it('auto-selects a single branch resolved from a streamed promise', async () => {
    const onValueChange = vi.fn()
    const onBranchesReady = vi.fn()
    render(
      <CustomerBranchField
        branches={Promise.resolve([{ id: 'br_kingston', name: 'Kingston' }])}
        value=""
        onValueChange={onValueChange}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    expect(screen.getByLabelText('Loading branches')).toBeVisible()
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith('br_kingston')
    )
    expect(onBranchesReady).toHaveBeenCalled()
  })

  it('does not auto-select after streaming multiple branches', async () => {
    const onValueChange = vi.fn()
    const onBranchesReady = vi.fn()
    render(
      <CustomerBranchField
        branches={Promise.resolve(BRANCHES)}
        value=""
        onValueChange={onValueChange}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    await waitFor(() => expect(onBranchesReady).toHaveBeenCalled())
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent(
      'Select branch'
    )
  })

  it('signals readiness even when the streamed branch list is empty', async () => {
    const onBranchesReady = vi.fn()
    render(
      <CustomerBranchField
        branches={Promise.resolve([])}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    await waitFor(() => expect(onBranchesReady).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeRequired()
  })

  it('does not overwrite an already selected value when a streamed promise resolves to a single branch', async () => {
    const onValueChange = vi.fn()
    render(
      <CustomerBranchField
        branches={Promise.resolve([{ id: 'br_mobay', name: 'Montego Bay' }])}
        value="br_kingston"
        onValueChange={onValueChange}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Branch' })).toBeVisible()
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps the skeleton visible until the promise resolves regardless of render timing', async () => {
    let resolve: (v: typeof BRANCHES) => void = () => {}
    const deferred = new Promise<typeof BRANCHES>((res) => {
      resolve = res
    })
    render(
      <CustomerBranchField
        branches={deferred}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByLabelText('Loading branches')).toBeVisible()
    expect(
      screen.queryByRole('combobox', { name: 'Branch' })
    ).not.toBeInTheDocument()
    resolve(BRANCHES)
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Branch' })).toBeVisible()
    )
    expect(screen.queryByLabelText('Loading branches')).not.toBeInTheDocument()
  })

  it('preserves auto-select even when the field is disabled', async () => {
    const onValueChange = vi.fn()
    render(
      <CustomerBranchField
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        value=""
        onValueChange={onValueChange}
        onBranchesReady={vi.fn()}
        disabled
      />
    )
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith('br_kingston')
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeDisabled()
  })

  it('calls onBranchesReady exactly once on initial mount for a resolved list', async () => {
    const onBranchesReady = vi.fn()
    const { rerender } = render(
      <CustomerBranchField
        branches={BRANCHES}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    await waitFor(() => expect(onBranchesReady).toHaveBeenCalledTimes(1))
    rerender(
      <CustomerBranchField
        branches={BRANCHES}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    expect(onBranchesReady).toHaveBeenCalled()
  })

  it('handles a stale branch ID that is not in the current list', () => {
    render(
      <CustomerBranchField
        branches={BRANCHES}
        value="br_stale"
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    const trigger = screen.getByRole('combobox', { name: 'Branch' })
    expect(trigger).not.toHaveTextContent('Kingston')
    expect(trigger).toHaveTextContent('br_stale')
  })

  it('re-signals readiness when branches identity changes from streamed to resolved', async () => {
    const onBranchesReady = vi.fn()
    const { rerender } = render(
      <CustomerBranchField
        branches={Promise.resolve(BRANCHES)}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    await waitFor(() => expect(onBranchesReady).toHaveBeenCalledTimes(1))
    rerender(
      <CustomerBranchField
        branches={BRANCHES}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    expect(onBranchesReady).toHaveBeenCalledTimes(2)
  })

  it('forwards className to the skeleton placeholder', () => {
    const never = new Promise<never>(() => {})
    const { container } = render(
      <CustomerBranchField
        branches={never as unknown as Promise<typeof BRANCHES>}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
        className="sm:grid-cols-[8rem_minmax(0,1fr)]"
      />
    )
    expect(container.querySelector('[data-slot="form-row"]')).toHaveClass(
      'sm:grid-cols-[8rem_minmax(0,1fr)]'
    )
  })

  it('does not call onValueChange when there are zero branches', () => {
    const onValueChange = vi.fn()
    const onBranchesReady = vi.fn()
    render(
      <CustomerBranchField
        branches={[]}
        value=""
        onValueChange={onValueChange}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    expect(onValueChange).not.toHaveBeenCalled()
    expect(onBranchesReady).toHaveBeenCalledTimes(1)
  })

  it('still signals readiness when a single branch is present but already selected', async () => {
    const onBranchesReady = vi.fn()
    const onValueChange = vi.fn()
    render(
      <CustomerBranchField
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        value="br_kingston"
        onValueChange={onValueChange}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    await waitFor(() => expect(onBranchesReady).toHaveBeenCalledTimes(1))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('renders branch names with special characters correctly', () => {
    render(
      <CustomerBranchField
        branches={[{ id: 'br_stann', name: "St. Ann's Bay" }]}
        value="br_stann"
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent(
      "St. Ann's Bay"
    )
  })

  it('keeps the field required even when disabled with no branches', () => {
    render(
      <CustomerBranchField
        branches={[]}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled
      />
    )
    const trigger = screen.getByRole('combobox', { name: 'Branch' })
    expect(trigger).toBeDisabled()
    expect(trigger).toBeRequired()
  })

  it('does not auto-select when branches changes from one to two after mount', async () => {
    const onValueChange = vi.fn()
    const onBranchesReady = vi.fn()
    const { rerender } = render(
      <CustomerBranchField
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        value=""
        onValueChange={onValueChange}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith('br_kingston')
    )
    onValueChange.mockClear()
    onBranchesReady.mockClear()
    rerender(
      <CustomerBranchField
        branches={BRANCHES}
        value="br_kingston"
        onValueChange={onValueChange}
        onBranchesReady={onBranchesReady}
        disabled={false}
      />
    )
    expect(onValueChange).not.toHaveBeenCalled()
    expect(onBranchesReady).toHaveBeenCalledTimes(1)
  })

  it('disables via the disabled prop even after a streamed promise resolves', async () => {
    const deferred = Promise.resolve(BRANCHES)
    render(
      <CustomerBranchField
        branches={deferred}
        value="br_kingston"
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Branch' })).toBeVisible()
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeDisabled()
  })

  it('shows placeholder Select branch when value is empty and multiple branches exist after streaming', async () => {
    render(
      <CustomerBranchField
        branches={Promise.resolve(BRANCHES)}
        value=""
        onValueChange={vi.fn()}
        onBranchesReady={vi.fn()}
        disabled={false}
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Branch' })).toBeVisible()
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent(
      'Select branch'
    )
  })
})
