// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TimesheetActions } from './timesheet-actions'
import type { TimesheetApprovalStatus } from './time-tracking'

type Role = 'owner' | 'approver' | 'neither'

const ROLES: Record<Role, { isOwner: boolean; canApprove: boolean }> = {
  owner: { isOwner: true, canApprove: false },
  approver: { isOwner: false, canApprove: true },
  neither: { isOwner: false, canApprove: false },
}

function renderActions({
  status = 'draft',
  role = 'owner',
  isOwner,
  canApprove,
}: {
  status?: TimesheetApprovalStatus
  role?: Role
  isOwner?: boolean
  canApprove?: boolean
} = {}) {
  const onSubmit = vi.fn()
  const onApprove = vi.fn()
  const onReject = vi.fn<(note: string) => void>()
  const onRecall = vi.fn()

  const view = render(
    <TimesheetActions
      status={status}
      isOwner={isOwner ?? ROLES[role].isOwner}
      canApprove={canApprove ?? ROLES[role].canApprove}
      onSubmit={onSubmit}
      onApprove={onApprove}
      onReject={onReject}
      onRecall={onRecall}
    />
  )

  return { onSubmit, onApprove, onReject, onRecall, ...view }
}

function buttons(): string[] {
  return screen
    .queryAllByRole('button')
    .map((button) => button.textContent ?? '')
}

function openRejectForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
}

function noteField(): HTMLElement {
  return screen.getByLabelText('Rejection note')
}

describe('TimesheetActions', () => {
  afterEach(cleanup)

  describe('draft', () => {
    it('offers Submit to the owner', () => {
      renderActions({ status: 'draft', role: 'owner' })

      expect(buttons()).toEqual(['Submit'])
    })

    it('offers nothing to an approver who does not own the draft', () => {
      renderActions({ status: 'draft', role: 'approver' })

      expect(buttons()).toEqual([])
    })

    it('offers nothing to a viewer who is neither', () => {
      renderActions({ status: 'draft', role: 'neither' })

      expect(buttons()).toEqual([])
    })
  })

  describe('submitted', () => {
    it('offers Recall to the owner', () => {
      renderActions({ status: 'submitted', role: 'owner' })

      expect(buttons()).toEqual(['Recall'])
    })

    it('offers Approve and Reject to an approver who is not the owner', () => {
      renderActions({ status: 'submitted', role: 'approver' })

      expect(buttons()).toEqual(['Approve', 'Reject'])
    })

    it('offers nothing to a viewer who is neither', () => {
      renderActions({ status: 'submitted', role: 'neither' })

      expect(buttons()).toEqual([])
    })

    it('offers no self-approval to an owner who can approve', () => {
      renderActions({ status: 'submitted', isOwner: true, canApprove: true })

      expect(buttons()).toEqual(['Recall'])
    })
  })

  describe('approved', () => {
    it('offers nothing to the owner', () => {
      renderActions({ status: 'approved', role: 'owner' })

      expect(buttons()).toEqual([])
    })

    it('offers nothing to an approver', () => {
      renderActions({ status: 'approved', role: 'approver' })

      expect(buttons()).toEqual([])
    })

    it('offers nothing to a viewer who is neither', () => {
      renderActions({ status: 'approved', role: 'neither' })

      expect(buttons()).toEqual([])
    })
  })

  describe('rejected', () => {
    it('offers nothing to the owner', () => {
      renderActions({ status: 'rejected', role: 'owner' })

      expect(buttons()).toEqual([])
    })

    it('offers nothing to an approver', () => {
      renderActions({ status: 'rejected', role: 'approver' })

      expect(buttons()).toEqual([])
    })

    it('offers nothing to a viewer who is neither', () => {
      renderActions({ status: 'rejected', role: 'neither' })

      expect(buttons()).toEqual([])
    })
  })

  it('submits once', () => {
    const { onSubmit, onRecall } = renderActions({ status: 'draft' })

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onRecall).not.toHaveBeenCalled()
  })

  it('recalls once', () => {
    const { onRecall, onSubmit } = renderActions({ status: 'submitted' })

    fireEvent.click(screen.getByRole('button', { name: 'Recall' }))

    expect(onRecall).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('approves once', () => {
    const { onApprove, onReject } = renderActions({
      status: 'submitted',
      role: 'approver',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onApprove).toHaveBeenCalledTimes(1)
    expect(onReject).not.toHaveBeenCalled()
  })

  it('opens a rejection note field instead of rejecting straight away', () => {
    const { onReject } = renderActions({
      status: 'submitted',
      role: 'approver',
    })

    openRejectForm()

    expect(noteField()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(onReject).not.toHaveBeenCalled()
  })

  it('keeps reject disabled until a note is typed', () => {
    renderActions({ status: 'submitted', role: 'approver' })

    openRejectForm()

    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled()

    fireEvent.change(noteField(), { target: { value: 'Hours do not match' } })

    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled()
  })

  it('treats a whitespace-only note as empty', () => {
    renderActions({ status: 'submitted', role: 'approver' })

    openRejectForm()
    fireEvent.change(noteField(), { target: { value: '   ' } })

    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled()
  })

  it('rejects once with the note that was typed', () => {
    const { onReject, onApprove } = renderActions({
      status: 'submitted',
      role: 'approver',
    })

    openRejectForm()
    fireEvent.change(noteField(), {
      target: { value: '  Hours do not match  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(onReject).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledWith('Hours do not match')
    expect(onApprove).not.toHaveBeenCalled()
  })

  it('closes the note field without rejecting', () => {
    const { onReject } = renderActions({
      status: 'submitted',
      role: 'approver',
    })

    openRejectForm()
    fireEvent.change(noteField(), { target: { value: 'Hours do not match' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onReject).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Rejection note')).toBeNull()
    expect(buttons()).toEqual(['Approve', 'Reject'])
  })
})
