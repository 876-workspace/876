// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { OneTimeSecret } from './one-time-secret'

describe('OneTimeSecret', () => {
  afterEach(cleanup)

  it('renders the secret value', () => {
    render(<OneTimeSecret secret="sk_abc123" />)
    expect(screen.getByText('sk_abc123')).toBeInTheDocument()
  })

  it('warns that it will not be shown again', () => {
    render(<OneTimeSecret secret="sk_abc123" />)
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument()
  })

  it('renders a copy button', () => {
    render(<OneTimeSecret secret="sk_abc123" />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('confirms after copying to the clipboard', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: async (): Promise<void> => undefined },
    })
    render(<OneTimeSecret secret="sk_abc123" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('labels the secret region', () => {
    render(<OneTimeSecret secret="sk_abc123" />)
    expect(screen.getByLabelText('New client secret')).toBeInTheDocument()
  })
})
