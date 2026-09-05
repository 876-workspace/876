import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MarkdownEditor } from './markdown-editor'

function renderEditor(props?: Partial<ComponentProps<typeof MarkdownEditor>>) {
  return render(
    <MarkdownEditor value="Draft" onValueChange={vi.fn()} {...props} />
  )
}

describe('MarkdownEditor visual contract', () => {
  it('renders Write as the initial active mode on a labelled editor group', () => {
    renderEditor()

    const editor = screen.getByRole('group', { name: 'Markdown editor' })

    expect(editor).toHaveAttribute('data-slot', 'markdown-editor')
    expect(editor).toHaveAttribute('data-mode', 'write')
    expect(screen.getByRole('button', { name: 'Write' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('switches the active mode to Preview and hides formatting actions', () => {
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(
      screen.getByRole('group', { name: 'Markdown editor' })
    ).toHaveAttribute('data-mode', 'preview')
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(
      screen.queryByRole('button', { name: 'Bold' })
    ).not.toBeInTheDocument()
  })

  it('keeps every formatting action accessible after the icon-toolbar redesign', () => {
    renderEditor()

    const actions = [
      'Bold',
      'Italic',
      'Strike',
      'Code',
      'Link',
      'Bullets',
      'Numbered',
      'Task',
      'Quote',
      'Block code',
    ]

    for (const name of actions) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('exposes the shared focus-within treatment on the editor surface', () => {
    renderEditor()

    expect(screen.getByRole('group', { name: 'Markdown editor' })).toHaveClass(
      'focus-within:ring-2',
      'focus-within:border-ring'
    )
  })

  it('disables mode controls, formatting actions, and the textarea together', () => {
    renderEditor({ disabled: true })

    expect(screen.getByRole('button', { name: 'Write' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled()
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
