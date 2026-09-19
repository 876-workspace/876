// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IssueAgentActions } from './issue-agent-actions'

const props = {
  issueRef: 'BILL-100',
  brief: '# BILL-100 — Storage-backed images for billing plans\n\nBrief body',
  issueUrl: 'https://876-projects.vercel.app/issues/BILL-100',
}

describe('IssueAgentActions', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('copies the exact MCP pointer prompt first', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<IssueAgentActions {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Agent copy options' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy for agent' }))

    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'Implement BILL-100 (Storage-backed images for billing plans) from 876 Projects. Fetch the issue with the 876-projects MCP server before you start.'
      )
    )
  })

  it('renders a failure state when the clipboard rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.assign(navigator, { clipboard: { writeText } })
    render(<IssueAgentActions {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Agent copy options' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy ref' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not copy. Try again.'
    )
  })

  it('labels the full brief as the non-MCP fallback', () => {
    render(<IssueAgentActions {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agent copy options' }))

    expect(
      screen.getByText('For an agent without MCP access')
    ).toBeInTheDocument()
  })
})
