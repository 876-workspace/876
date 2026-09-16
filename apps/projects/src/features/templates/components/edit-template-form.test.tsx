// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client/templates', () => ({
  templatesClient: { update: mocks.update },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    refresh: mocks.refresh,
  }),
}))

const { EditTemplateForm } = await import('./edit-template-form')

const TEMPLATE = { id: 'tpl_1', name: 'Agile sprint', description: 'Cadence' }

beforeEach(() => {
  mocks.update.mockResolvedValue({ data: TEMPLATE, error: null })
})

afterEach(cleanup)

describe('EditTemplateForm', () => {
  it('prefills the name and description the template has today', () => {
    render(<EditTemplateForm template={TEMPLATE} />)

    expect(screen.getByLabelText('Name')).toHaveValue('Agile sprint')
    expect(screen.getByLabelText('Description')).toHaveValue('Cadence')
  })

  it('saves the edit and returns to the template', async () => {
    render(<EditTemplateForm template={TEMPLATE} />)

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Agile delivery' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('button', { name: 'Save' })

    expect(mocks.update).toHaveBeenCalledWith('tpl_1', {
      name: 'Agile delivery',
      description: 'Cadence',
    })
    expect(mocks.push).toHaveBeenCalledWith('/settings/templates/tpl_1')
  })

  it('banners an edit that could not be saved', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'projects/template-not-found', message: 'Gone.' },
    })
    render(<EditTemplateForm template={TEMPLATE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('The template could not be saved')

    expect(mocks.push).not.toHaveBeenCalled()
  })
})
