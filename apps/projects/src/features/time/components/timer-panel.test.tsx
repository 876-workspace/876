import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: {
    startTimer: mocks.startTimer,
    stopTimer: mocks.stopTimer,
  },
}))

const { TimerPanel } = await import('./timer-panel')
const { IDLE_TIMER_LABEL } = await import('./timer-state')

const PROJECTS = [{ id: 'prj_1', name: 'Website rebuild' }]
const STARTED_AT = 1704273300

const IDLE = { running: false, startedAt: null, label: IDLE_TIMER_LABEL }
const RUNNING = {
  running: true,
  startedAt: STARTED_AT,
  label: 'Tracking Website rebuild',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.startTimer.mockResolvedValue({
    data: {
      stopped: null,
      started: { object: 'projects.time-entry', id: 'tme_1', startedAt: STARTED_AT },
    },
    error: null,
  })
  mocks.stopTimer.mockResolvedValue({
    data: { object: 'projects.time-entry', id: 'tme_1', durationMinutes: 90 },
    error: null,
  })
})

describe('TimerPanel', () => {
  it('says where a running timer is going', () => {
    render(
      <TimerPanel
        timer={RUNNING}
        projects={PROJECTS}
        fixedProjectId="prj_1"
        disabled={false}
      />
    )

    expect(screen.getByText('Tracking Website rebuild')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled()
  })

  it('starts a timer on the project the page is about', async () => {
    const user = userEvent.setup()
    render(
      <TimerPanel
        timer={IDLE}
        projects={PROJECTS}
        fixedProjectId="prj_1"
        disabled={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(mocks.startTimer).toHaveBeenCalledWith({ projectId: 'prj_1' })
    expect(screen.getByText('Tracking Website rebuild')).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('stops the running timer and reports nothing running', async () => {
    const user = userEvent.setup()
    render(
      <TimerPanel
        timer={RUNNING}
        projects={PROJECTS}
        fixedProjectId="prj_1"
        disabled={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Stop' }))

    expect(mocks.stopTimer).toHaveBeenCalled()
    expect(screen.getByText(IDLE_TIMER_LABEL)).toBeInTheDocument()
  })

  it('names what is missing instead of asking the service to guess', async () => {
    const user = userEvent.setup()
    render(<TimerPanel timer={IDLE} projects={[]} disabled={false} />)

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(
      screen.getByText('Choose a project to track time against.')
    ).toBeInTheDocument()
    expect(mocks.startTimer).not.toHaveBeenCalled()
  })

  it('keeps the bar where it was when the service refuses the start', async () => {
    const user = userEvent.setup()
    mocks.startTimer.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })
    render(
      <TimerPanel
        timer={IDLE}
        projects={PROJECTS}
        fixedProjectId="prj_1"
        disabled={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(
      screen.getByText('That project does not exist.')
    ).toBeInTheDocument()
    expect(screen.getByText(IDLE_TIMER_LABEL)).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('offers a project picker when the page is not about one project', () => {
    const { rerender } = render(
      <TimerPanel timer={IDLE} projects={PROJECTS} disabled={false} />
    )

    expect(screen.getByLabelText('Project')).toBeInTheDocument()

    rerender(
      <TimerPanel
        timer={IDLE}
        projects={PROJECTS}
        fixedProjectId="prj_1"
        disabled={false}
      />
    )

    expect(screen.queryByLabelText('Project')).toBeNull()
  })

  it('takes both actions away from a viewer who cannot edit', () => {
    render(
      <TimerPanel
        timer={RUNNING}
        projects={PROJECTS}
        fixedProjectId="prj_1"
        disabled
      />
    )

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })
})
