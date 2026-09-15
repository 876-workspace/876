/** @vitest-environment jsdom */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  setDefault: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    documentTemplates: {
      setDefault: mocks.setDefault,
      delete: mocks.remove,
    },
  },
}))

import { TemplateCardActions } from './template-card-actions'

function renderActions(
  overrides: Partial<React.ComponentProps<typeof TemplateCardActions>> = {}
) {
  return render(
    <TemplateCardActions
      templateId="dtpl_1"
      isDefault={false}
      canManage
      {...overrides}
    />
  )
}

describe('TemplateCardActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.setDefault.mockResolvedValue({ data: null, error: null })
    mocks.remove.mockResolvedValue({ data: null, error: null })
  })

  it('sets the template as default with the exact id then refreshes', async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Set as default' }))

    await waitFor(() => expect(mocks.setDefault).toHaveBeenCalledTimes(1))
    expect(mocks.setDefault).toHaveBeenCalledWith('dtpl_1')
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('hides the default action for the default template', async () => {
    const user = userEvent.setup()
    renderActions({ isDefault: true })

    expect(
      screen.queryByRole('button', { name: 'Set as default' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('deletes with the exact id after confirmation then refreshes', async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1))
    expect(mocks.remove).toHaveBeenCalledWith('dtpl_1')
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
  })

  it('keeps the card and shows the message when deletion fails', async () => {
    const user = userEvent.setup()
    mocks.remove.mockResolvedValue({
      data: null,
      error: { message: 'Template is in use.' },
    })
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Template is in use.'
    )
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('renders nothing without manage permission', () => {
    const { container } = renderActions({ canManage: false })

    expect(container).toBeEmptyDOMElement()
  })
})
