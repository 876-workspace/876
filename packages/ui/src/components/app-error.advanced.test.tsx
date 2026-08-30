import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppError, AppErrorCode } from './app-error'

function error(overrides: Partial<{ code: string; message: string }> = {}) {
  return {
    code: 'crm/team-not-found',
    message: 'Team not found.',
    ...overrides,
  }
}

describe('AppError - non-blocking notice', () => {
  it('renders message with role status and polite live region', () => {
    render(<AppError error={error()} />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Team not found.')).toBeVisible()
  })

  it('renders title when provided', () => {
    render(<AppError error={error()} title="Could not load teams" />)
    expect(screen.getByText('Could not load teams')).toBeVisible()
    expect(screen.getByText('Team not found.')).toBeVisible()
  })

  it('hides code by default, shows when showCode true', () => {
    const { rerender } = render(<AppError error={error()} />)
    expect(screen.queryByText('crm/team-not-found')).not.toBeInTheDocument()
    rerender(<AppError error={error()} showCode />)
    expect(screen.getByText('crm/team-not-found')).toBeVisible()
  })

  it('renders banner variant with icon container', () => {
    render(<AppError error={error()} variant="banner" />)
    expect(screen.getByRole('status')).toBeVisible()
    expect(screen.getByText('Team not found.')).toBeVisible()
  })

  it('renders inline variant as compact text', () => {
    render(<AppError error={error()} variant="inline" title="Inline title" />)
    expect(screen.getByText('Inline title')).toBeVisible()
    expect(screen.getByText('Team not found.')).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders section variant with border styling', () => {
    render(
      <AppError
        error={error()}
        variant="section"
        title="Section failure"
        showCode
      />
    )
    expect(screen.getByText('Section failure')).toBeVisible()
    expect(screen.getByText('crm/team-not-found')).toBeVisible()
  })

  it('renders form variant and preserves action slot', () => {
    render(
      <AppError
        error={error()}
        variant="form"
        title="Form error"
        action={<button>Retry</button>}
      />
    )
    expect(screen.getByText('Form error')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })

  it('does not render title element when not provided', () => {
    render(<AppError error={error()} />)
    expect(screen.queryByText('Could not load')).not.toBeInTheDocument()
  })

  it('AppErrorCode renders code as monospace break-all', () => {
    render(<AppErrorCode code="crm/request-not-found" />)
    expect(screen.getByText('crm/request-not-found')).toBeVisible()
    expect(screen.getByText('crm/request-not-found').tagName).toBe('CODE')
  })

  it('is accessible: message is not an alert that would steal focus', () => {
    render(
      <AppError
        error={error({ message: 'Customer not found.' })}
        title="Load failed"
      />
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeVisible()
  })

  it('showsCode reveals registry code for console debugging', () => {
    render(
      <AppError
        error={error({
          code: 'crm/tenant-inactive',
          message: 'Workspace not active.',
        })}
        showCode
      />
    )
    expect(screen.getByText('crm/tenant-inactive')).toBeVisible()
  })

  it('never renders httpStatus', () => {
    render(<AppError error={error()} showCode />)
    expect(screen.queryByText(/404/)).not.toBeInTheDocument()
    expect(screen.queryByText(/500/)).not.toBeInTheDocument()
  })
})
