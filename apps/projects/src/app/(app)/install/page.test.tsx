/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import InstallPage, { metadata } from './page'

describe('InstallPage', () => {
  it('renders all three platform sections on the server', () => {
    render(<InstallPage />)

    expect(
      screen.getByRole('heading', { name: 'iPhone / iPad (Safari)' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Android (Chrome)' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Desktop (Chrome / Edge)' })
    ).toBeInTheDocument()
  })

  it('renders the numbered steps for every platform', () => {
    render(<InstallPage />)

    expect(screen.getAllByRole('list', { name: '' })).toHaveLength(4)
    expect(screen.getAllByRole('listitem')).toHaveLength(11)
    expect(screen.getByText('Tap Share.')).toBeInTheDocument()
    expect(screen.getByText('Tap Install.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Click the install icon in the address bar, or open the ⋮ menu.'
      )
    ).toBeInTheDocument()
  })

  it('states that Safari is required on iPhone and iPad', () => {
    render(<InstallPage />)

    expect(
      screen.getByText(
        'Open 876 Projects in Safari; Chrome on iOS cannot install a web app.'
      )
    ).toBeInTheDocument()
  })

  it('exports the local install title metadata', () => {
    expect(metadata).toEqual({ title: 'Install' })
  })
})
