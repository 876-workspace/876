// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cloneProject: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client/templates', () => ({
  templatesClient: { cloneProject: mocks.cloneProject },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    refresh: mocks.refresh,
  }),
}))

const { CloneProjectForm } = await import('./clone-project-form')

beforeEach(() => {
  mocks.cloneProject.mockResolvedValue({
    data: { id: 'prj_2' },
    error: null,
  })
})

afterEach(cleanup)

describe('CloneProjectForm', () => {
  it('clones without a start date and opens the new project', async () => {
    render(
      <CloneProjectForm
        project={{ id: 'prj_1', name: 'Apollo', key: 'APOLLO' }}
      />
    )

    expect(screen.getByLabelText('Name')).toHaveValue('Apollo copy')
    fireEvent.click(screen.getByRole('button', { name: 'Clone' }))
    await screen.findByRole('button', { name: 'Clone' })

    expect(mocks.cloneProject).toHaveBeenCalledWith('prj_1', {
      name: 'Apollo copy',
      key: 'APOLLO',
    })
    expect(mocks.push).toHaveBeenCalledWith('/projects/prj_2')
  })

  it('banners a project that could not be cloned', async () => {
    mocks.cloneProject.mockResolvedValue({
      data: null,
      error: { code: 'projects/project-key-taken', message: 'Taken.' },
    })
    render(
      <CloneProjectForm
        project={{ id: 'prj_1', name: 'Apollo', key: 'APOLLO' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clone' }))
    await screen.findByText('The project could not be cloned')

    expect(mocks.push).not.toHaveBeenCalled()
  })
})
