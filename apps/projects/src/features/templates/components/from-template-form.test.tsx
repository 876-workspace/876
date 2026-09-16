// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  instantiate: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/lib/client/templates', () => ({
  templatesClient: { instantiate: mocks.instantiate },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    refresh: mocks.refresh,
    replace: mocks.replace,
  }),
}))

const { FromTemplateForm } = await import('./from-template-form')

const TEMPLATES = [
  { id: 'tpl_1', key: 'agile-sprint', name: 'Agile sprint' },
  { id: 'tpl_2', key: 'launch', name: 'Launch' },
]

const INITIAL = {
  templateId: '',
  start: '2026-09-01',
  include: { includeWorkItems: true, includeDependencies: true, includeBudgets: true },
}

beforeEach(() => {
  mocks.instantiate.mockResolvedValue({ data: { id: 'prj_2' }, error: null })
})

afterEach(cleanup)

describe('FromTemplateForm', () => {
  it('syncs the preview URL when the template changes', () => {
    render(<FromTemplateForm templates={TEMPLATES} initial={INITIAL} />)

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'tpl_1' },
    })

    expect(mocks.replace).toHaveBeenCalledWith(
      expect.stringContaining('/projects/new/from-template?'),
      expect.anything()
    )
    expect(mocks.replace).toHaveBeenCalledWith(
      expect.stringContaining('templateId=tpl_1'),
      expect.anything()
    )
  })

  it('creates the project from the chosen template and opens it', async () => {
    render(<FromTemplateForm templates={TEMPLATES} initial={INITIAL} />)

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'tpl_1' },
    })
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Apollo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByRole('button', { name: 'Create' })

    expect(mocks.instantiate).toHaveBeenCalledWith(
      'tpl_1',
      expect.objectContaining({
        name: 'Apollo',
        startDate: Date.UTC(2026, 8, 1) / 1000,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/projects/prj_2')
  })

  it('reuses one idempotency key for the life of the form', async () => {
    render(<FromTemplateForm templates={TEMPLATES} initial={INITIAL} />)

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'tpl_1' },
    })
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Apollo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByRole('button', { name: 'Create' })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByRole('button', { name: 'Create' })

    const first = mocks.instantiate.mock.calls[0][1].idempotencyKey
    const second = mocks.instantiate.mock.calls[1][1].idempotencyKey
    expect(typeof first).toBe('string')
    expect(first).not.toBe('')
    expect(second).toBe(first)
  })

  it('banners a project that could not be created', async () => {
    mocks.instantiate.mockResolvedValue({
      data: null,
      error: { code: 'projects/template-missing-references', message: 'Missing.' },
    })
    render(<FromTemplateForm templates={TEMPLATES} initial={INITIAL} />)

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'tpl_1' },
    })
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Apollo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByText('The project could not be created')

    expect(mocks.push).not.toHaveBeenCalled()
  })
})
