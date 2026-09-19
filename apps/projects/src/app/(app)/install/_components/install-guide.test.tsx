/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InstallGuide } from './install-guide'

function setStandalone(value: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: value })
}

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(navigator, 'standalone', {
    configurable: true,
    value: undefined,
  })
})

describe('InstallGuide', () => {
  it('renders the already-installed state in standalone display mode', async () => {
    setStandalone(true)
    render(<InstallGuide />)

    expect(await screen.findByText('876 Projects is installed.')).toBeVisible()
    expect(screen.queryByText('Android (Chrome)')).toBeNull()
  })

  it('renders the already-installed state from navigator.standalone', async () => {
    setStandalone(false)
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    })
    render(<InstallGuide />)

    expect(await screen.findByText('876 Projects is installed.')).toBeVisible()
    expect(screen.queryByText('After you install')).toBeNull()
  })

  it('renders manual steps when no install signal is available', async () => {
    setStandalone(false)
    render(<InstallGuide />)

    expect(await screen.findByText('After you install')).toBeVisible()
    expect(screen.getByText('Opens without browser chrome.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull()
  })

  it('renders an Install button after beforeinstallprompt fires', async () => {
    setStandalone(false)
    render(<InstallGuide />)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
    })

    window.dispatchEvent(event)

    expect(await screen.findByRole('button', { name: 'Install' })).toBeVisible()
  })

  it('calls prompt exactly once when Install is clicked', async () => {
    setStandalone(false)
    render(<InstallGuide />)
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), { prompt })
    window.dispatchEvent(event)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Install' }))

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(prompt).toHaveBeenCalledWith()
  })

  it('hides Install after its prompt resolves', async () => {
    setStandalone(false)
    render(<InstallGuide />)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
    })
    window.dispatchEvent(event)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Install' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Install' })).toBeNull()
    })
  })
})
