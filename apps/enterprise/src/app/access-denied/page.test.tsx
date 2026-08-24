import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./_components/change-account-action', () => ({
  ChangeAccountAction: () => <button>Change account</button>,
}))

import AccessDeniedPage from './page'

describe('AccessDeniedPage', () => {
  it('blocks consumer accounts without linking to the consumer app', () => {
    render(<AccessDeniedPage />)

    expect(
      screen.getByRole('heading', {
        name: 'This workspace needs a work account',
      })
    ).toBeVisible()
    expect(
      screen.getByText(/personal 876 account.*Enterprise account/i)
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Change account' })).toBeVisible()
    expect(screen.queryByText('Go to my 876 account')).not.toBeInTheDocument()
  })
})
