// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  saveAsTemplate: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client/templates', () => ({
  templatesClient: { saveAsTemplate: mocks.saveAsTemplate },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    refresh: mocks.refresh,
  }),
}))

const { SaveAsTemplateForm } = await import('./save-as-template-form')

beforeEach(() => {
  mocks.saveAsTemplate.mockResolvedValue({
    data: { id: 'tpl_1' },
    error: null,
  })
})

afterEach(cleanup)

describe('SaveAsTemplateForm', () => {
  it('saves the project as a template and opens the template', async () => {
    render(<SaveAsTemplateForm project={{ id: 'prj_1', name: 'Apollo' }} />)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Key'), {
      target: { value: 'Apollo Launch' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('button', { name: 'Save' })

    expect(mocks.saveAsTemplate).toHaveBeenCalledWith('prj_1', {
      key: 'apollo-launch',
      name: 'Apollo',
      description: null,
    })
    expect(mocks.push).toHaveBeenCalledWith('/settings/templates/tpl_1')
  })

  it('banners a template that could not be saved', async () => {
    mocks.saveAsTemplate.mockResolvedValue({
      data: null,
      error: { code: 'projects/template-key-taken', message: 'Taken.' },
    })
    render(<SaveAsTemplateForm project={{ id: 'prj_1', name: 'Apollo' }} />)

    fireEvent.change(screen.getByLabelText('Key'), {
      target: { value: 'apollo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('The template could not be saved')

    expect(mocks.push).not.toHaveBeenCalled()
  })
})
