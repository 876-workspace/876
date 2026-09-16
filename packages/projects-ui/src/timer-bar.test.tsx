// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TimerBar } from './timer-bar'

const START = Date.UTC(2026, 8, 15, 10, 0, 0)
const LABEL = 'Acme Redesign · Fix the login redirect'

/** Unix seconds for a moment `seconds` before the faked clock's start. */
function secondsAgo(seconds: number): number {
  return START / 1000 - seconds
}

function renderBar({
  running = true,
  startedAt = secondsAgo(65),
  label = LABEL,
  disabled = false,
}: {
  running?: boolean
  startedAt?: number | null
  label?: string
  disabled?: boolean
} = {}) {
  const onStart = vi.fn()
  const onStop = vi.fn()

  const view = render(
    <TimerBar
      running={running}
      startedAt={startedAt}
      label={label}
      onStart={onStart}
      onStop={onStop}
      disabled={disabled}
    />
  )

  return { onStart, onStop, ...view }
}

function elapsed(): HTMLElement {
  const element = document.querySelector('[data-timer-elapsed]')
  if (!element) throw new Error('Missing elapsed element')
  return element as HTMLElement
}

describe('TimerBar', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders the elapsed time counted back from startedAt', () => {
    vi.useFakeTimers({ now: START })
    renderBar({ startedAt: secondsAgo(65) })

    expect(elapsed()).toHaveTextContent('01:05')
  })

  it('advances the elapsed time once a second', () => {
    vi.useFakeTimers({ now: START })
    renderBar()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(elapsed()).toHaveTextContent('01:06')

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(elapsed()).toHaveTextContent('02:05')
  })

  it('rolls into hours and minutes past an hour', () => {
    vi.useFakeTimers({ now: START })
    renderBar({ startedAt: secondsAgo(3661) })

    expect(elapsed()).toHaveTextContent('1:01:01')
  })

  it('stops ticking when the timer is not running', () => {
    vi.useFakeTimers({ now: START })
    renderBar({ running: false, startedAt: secondsAgo(65) })

    expect(elapsed()).toHaveTextContent('00:00')

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(elapsed()).toHaveTextContent('00:00')
    expect(elapsed()).toHaveAttribute('aria-label', 'No timer running')
  })

  it('keeps the accessible label unchanged between minutes', () => {
    vi.useFakeTimers({ now: START })
    renderBar()

    expect(elapsed()).toHaveAttribute('aria-label', 'Elapsed 1m')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(elapsed()).toHaveTextContent('01:06')
    expect(elapsed()).toHaveAttribute('aria-label', 'Elapsed 1m')
  })

  it('moves the accessible label on each new minute', () => {
    vi.useFakeTimers({ now: START })
    renderBar()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(elapsed()).toHaveAttribute('aria-label', 'Elapsed 2m')
  })

  it('labels an elapsed time below a minute', () => {
    vi.useFakeTimers({ now: START })
    renderBar({ startedAt: START / 1000 - 20 })

    expect(elapsed()).toHaveTextContent('00:20')
    expect(elapsed()).toHaveAttribute(
      'aria-label',
      'Elapsed less than a minute'
    )
  })

  it('keeps the running clock out of live regions', () => {
    vi.useFakeTimers({ now: START })
    renderBar()

    expect(elapsed()).toHaveAttribute('aria-live', 'off')
    expect(screen.getByLabelText(/^Elapsed/)).toBe(elapsed())
  })

  it('shows what is being tracked while running', () => {
    vi.useFakeTimers({ now: START })
    renderBar()

    expect(document.querySelector('[data-timer-label]')).toHaveTextContent(
      LABEL
    )
  })

  it('calls onStart once when start is pressed', () => {
    vi.useFakeTimers({ now: START })
    const { onStart, onStop } = renderBar({ running: false, startedAt: null })

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStop).not.toHaveBeenCalled()
  })

  it('calls onStop once when stop is pressed', () => {
    vi.useFakeTimers({ now: START })
    const { onStart, onStop } = renderBar()

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(onStop).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('disables start while a timer is already running', () => {
    vi.useFakeTimers({ now: START })
    renderBar({ running: true })

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled()
  })

  it('disables stop while no timer is running', () => {
    vi.useFakeTimers({ now: START })
    renderBar({ running: false, startedAt: null })

    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  it('disables both buttons when the viewer cannot write time', () => {
    vi.useFakeTimers({ now: START })
    renderBar({ running: true, disabled: true })

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })
})
