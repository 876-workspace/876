import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_BRANDING } from '@876/core/branding'

import {
  DocumentTemplateEditor,
  type DocumentTemplateEditorProps,
} from './document-template-editor'

function props(
  overrides: Partial<DocumentTemplateEditorProps> = {}
): DocumentTemplateEditorProps {
  return {
    documentType: 'invoice',
    initial: { name: 'Standard', layout: 'standard', settings: {} },
    branding: DEFAULT_BRANDING,
    onSubmit: vi.fn(async () => ({ error: null })),
    cancelHref: '/templates',
    ...overrides,
  }
}

describe('DocumentTemplateEditor', () => {
  it('renders all six tabs', () => {
    // ARRANGE
    render(<DocumentTemplateEditor {...props()} />)

    // ASSERT
    for (const tab of [
      'General',
      'Header & Footer',
      'Transaction Details',
      'Table',
      'Total',
      'Other Details',
    ]) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument()
    }
  })

  it('updates the preview when the title is edited', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props()} />)
    await user.click(screen.getByRole('tab', { name: 'Transaction Details' }))

    // ACT
    fireEvent.change(screen.getByLabelText('Document title'), {
      target: { value: 'TAX INVOICE' },
    })

    // ASSERT
    expect(screen.getByLabelText('Template preview').textContent).toContain(
      'TAX INVOICE'
    )
  })

  it('updates the preview when a column is hidden', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props()} />)
    await user.click(screen.getByRole('tab', { name: 'Table' }))
    expect(
      screen.getByLabelText('Template preview').querySelectorAll('th').length
    ).toBeGreaterThan(0)

    // ACT
    await user.click(screen.getByRole('switch', { name: 'Show rate column' }))

    // ASSERT
    expect(screen.getByLabelText('Template preview').textContent).not.toContain(
      'Price'
    )
    const preview = screen.getByLabelText('Template preview')
    expect(
      Array.from(preview.querySelectorAll('th')).map((cell) => cell.textContent)
    ).not.toContain('Rate')
  })

  it('submits an overrides-only payload', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props({ onSubmit })} />)
    await user.click(screen.getByRole('tab', { name: 'Transaction Details' }))
    fireEvent.change(screen.getByLabelText('Document title'), {
      target: { value: 'Tax Invoice' },
    })

    // ACT
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // ASSERT
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Standard',
      layout: 'standard',
      settings: { documentDetails: { title: 'Tax Invoice' } },
    })
  })

  it('keeps entered values when submit fails', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({
      error: { message: 'Name is taken' },
    }))
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props({ onSubmit })} />)
    await user.click(screen.getByRole('tab', { name: 'Transaction Details' }))
    fireEvent.change(screen.getByLabelText('Document title'), {
      target: { value: 'Tax Invoice' },
    })

    // ACT
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // ASSERT
    expect(screen.getByText('Name is taken')).toBeInTheDocument()
    expect(screen.getByLabelText('Document title')).toHaveValue('Tax Invoice')
  })

  it('disables submit while a save is pending', async () => {
    // ARRANGE
    const onSubmit = vi.fn(() => new Promise<{ error: null }>(() => {}))
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props({ onSubmit })} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // ASSERT
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('limits the layout select to layouts supporting invoices', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props()} />)

    // ACT
    await user.click(screen.getByRole('combobox', { name: 'Layout' }))

    // ASSERT
    expect(screen.getByRole('option', { name: 'Standard' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Elegant' })).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Retail receipt' })
    ).not.toBeInTheDocument()
  })

  it('shows an inline error and blocks submit for an invalid hex color', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ error: null }))
    render(<DocumentTemplateEditor {...props({ onSubmit })} />)

    // ACT
    fireEvent.change(screen.getByLabelText('Font color'), {
      target: { value: 'not-a-color' },
    })

    // ASSERT
    expect(
      screen.getByText('Use a six-digit hex color such as #1f6feb.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('re-bases on the new layout defaults when the layout changes', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props({ onSubmit })} />)
    await user.click(screen.getByRole('tab', { name: 'Transaction Details' }))
    fireEvent.change(screen.getByLabelText('Document title'), {
      target: { value: 'Tax Invoice' },
    })

    // ACT — european keeps the title edit but takes its own title size.
    await user.click(screen.getByRole('combobox', { name: 'Layout' }))
    await user.click(screen.getByRole('option', { name: 'European' }))

    // ASSERT — the preview re-based: kept the edited title, took the
    // european title size (22px) instead of the standard one (28px).
    expect(screen.getByLabelText('Template preview').textContent).toContain(
      'Tax Invoice'
    )
    expect(screen.getByText('Tax Invoice')).toHaveStyle({ fontSize: '22px' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // ASSERT
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Standard',
      layout: 'european',
      settings: {
        documentDetails: {
          title: 'Tax Invoice',
        },
      },
    })
  })

  it('inserts a placeholder token into header content', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props()} />)
    await user.click(screen.getByRole('tab', { name: 'Header & Footer' }))
    await user.click(
      screen.getAllByRole('button', { name: 'Insert placeholder' })[0]
    )

    // ACT
    await user.click(
      screen.getByRole('button', { name: '%organization.name%' })
    )

    // ASSERT
    expect(screen.getByLabelText('Header content')).toHaveValue(
      '%organization.name%'
    )
  })

  it('toggles the accent between brand and custom', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentTemplateEditor {...props()} />)

    // ACT — brand mode shows no custom controls.
    expect(
      screen.queryByLabelText('Custom accent color')
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Custom' }))

    // ASSERT
    expect(screen.getByLabelText('Custom accent color')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rose' }))
    expect(screen.getByLabelText('Custom accent color')).toHaveValue('#e11d48')
  })

  it('renders the payment stub switch for invoices only', async () => {
    // ARRANGE
    const user = userEvent.setup()
    const { unmount } = render(<DocumentTemplateEditor {...props()} />)

    // ASSERT
    expect(
      screen.getByRole('switch', { name: 'Include payment stub' })
    ).toBeInTheDocument()

    // ACT
    unmount()
    render(<DocumentTemplateEditor {...props({ documentType: 'quote' })} />)

    // ASSERT
    expect(
      screen.queryByRole('switch', { name: 'Include payment stub' })
    ).not.toBeInTheDocument()
    expect(user).toBeDefined()
  })

  it('links cancel to the host href', () => {
    // ARRANGE
    render(<DocumentTemplateEditor {...props({ cancelHref: '/templates' })} />)

    // ASSERT
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/templates'
    )
  })

  it('renders disabled upload placeholders instead of an upload path', () => {
    // ARRANGE
    render(<DocumentTemplateEditor {...props()} />)

    // ASSERT
    expect(screen.getByLabelText('Background image')).toBeDisabled()
    expect(screen.getByLabelText('Background image')).toHaveAttribute(
      'placeholder',
      'Upload coming soon'
    )
  })
})
