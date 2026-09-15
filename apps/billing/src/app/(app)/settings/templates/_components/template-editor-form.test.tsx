/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_BRANDING } from '@876/core/branding'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    documentTemplates: {
      create: mocks.create,
      update: mocks.update,
    },
  },
}))

import { TemplateEditorForm } from './template-editor-form'

const branding = { ...DEFAULT_BRANDING }

function renderCreate() {
  return render(
    <TemplateEditorForm
      mode="create"
      documentType="invoice"
      branding={branding}
      initial={{ name: 'Invoice template', layout: 'standard', settings: {} }}
      cancelHref="/settings/templates?type=invoice"
    />
  )
}

function renderUpdate() {
  return render(
    <TemplateEditorForm
      mode="update"
      templateId="dtpl_1"
      documentType="invoice"
      branding={branding}
      initial={{ name: 'Invoice template', layout: 'standard', settings: {} }}
      cancelHref="/settings/templates?type=invoice"
    />
  )
}

describe('TemplateEditorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: null, error: null })
    mocks.update.mockResolvedValue({ data: null, error: null })
  })

  it('creates with the exact payload then returns to the list', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith({
      documentType: 'invoice',
      name: 'Invoice template',
      layout: 'standard',
      settings: {},
    })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith('/settings/templates?type=invoice')
  })

  it('updates with the exact id and payload then returns to the list', async () => {
    const user = userEvent.setup()
    renderUpdate()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('dtpl_1', {
      name: 'Invoice template',
      layout: 'standard',
      settings: {},
    })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith('/settings/templates?type=invoice')
  })

  it('keeps the form when saving fails', async () => {
    const user = userEvent.setup()
    mocks.create.mockResolvedValue({
      data: null,
      error: { message: 'Name is taken.' },
    })
    renderCreate()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is taken.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Invoice template')).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
