import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MarkdownEditor } from './markdown-editor'

afterEach(() => {
  vi.unstubAllGlobals()
})

type EditorProps = Omit<
  ComponentProps<typeof MarkdownEditor>,
  'value' | 'onValueChange'
>

function ControlledEditor({
  initialValue = '',
  onValueChange,
  ...props
}: EditorProps & {
  initialValue?: string
  onValueChange?: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)

  return (
    <MarkdownEditor
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
      {...props}
    />
  )
}

function selectWord(box: HTMLTextAreaElement, text: string, word: string) {
  const start = text.indexOf(word)

  box.focus()
  box.setSelectionRange(start, start + word.length)

  return { start, end: start + word.length }
}

function moveCursorToEnd(box: HTMLTextAreaElement, text: string) {
  box.focus()
  box.setSelectionRange(text.length, text.length)
}

describe('MarkdownEditor tabs', () => {
  it('Write tab, on initial render, shows the textarea with the current value', () => {
    render(<ControlledEditor initialValue="Ship the release notes draft" />)

    expect(screen.getByRole('textbox')).toHaveValue(
      'Ship the release notes draft'
    )
    expect(screen.getByRole('button', { name: 'Write' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('Preview tab, with markdown content, renders the formatted content and hides the editor', () => {
    render(
      <ControlledEditor
        initialValue={'# Release checklist\n\n- [x] Freeze the schema'}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(
      screen.getByRole('heading', { name: 'Release checklist' })
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('Preview tab, with empty content, shows the empty-preview message', () => {
    render(<ControlledEditor initialValue="" />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(screen.getByText('Nothing to preview.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('Preview tab, after switching back to Write, restores the editor with the same value', () => {
    render(<ControlledEditor initialValue="Draft the migration runbook" />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    fireEvent.click(screen.getByRole('button', { name: 'Write' }))

    expect(screen.getByRole('textbox')).toHaveValue(
      'Draft the migration runbook'
    )
  })
})

describe('MarkdownEditor toolbar', () => {
  it('Bold tool, with text selected, wraps the selection in double asterisks', () => {
    const initial = 'Ship the release notes draft'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'release notes')

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(box).toHaveValue('Ship the **release notes** draft')
  })

  it('Italic tool, with text selected, wraps the selection in single asterisks', () => {
    const initial = 'Draft the migration runbook'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'migration')

    fireEvent.click(screen.getByRole('button', { name: 'Italic' }))

    expect(box).toHaveValue('Draft the *migration* runbook')
  })

  it('Strike tool, with text selected, wraps the selection in tildes', () => {
    const initial = 'Remove the legacy billing banner'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'legacy')

    fireEvent.click(screen.getByRole('button', { name: 'Strike' }))

    expect(box).toHaveValue('Remove the ~~legacy~~ billing banner')
  })

  it('Code tool, with text selected, wraps the selection in backticks', () => {
    const initial = 'Restart the payments worker'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'payments worker')

    fireEvent.click(screen.getByRole('button', { name: 'Code' }))

    expect(box).toHaveValue('Restart the `payments worker`')
  })

  it('Link tool, with text selected, wraps the selection in a link template', () => {
    const initial = 'Read the deployment guide'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'deployment guide')

    fireEvent.click(screen.getByRole('button', { name: 'Link' }))

    expect(box).toHaveValue('Read the [deployment guide](https://)')
  })

  it('Bullets tool, with text selected, inserts the bullet prefix before the selection', () => {
    const initial = 'Rotate the staging credentials'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'staging credentials')

    fireEvent.click(screen.getByRole('button', { name: 'Bullets' }))

    expect(box).toHaveValue('Rotate the - staging credentials')
  })

  it('Numbered tool, with text selected, inserts the numbered prefix before the selection', () => {
    const initial = 'Backfill the missing invoice events'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'missing invoice events')

    fireEvent.click(screen.getByRole('button', { name: 'Numbered' }))

    expect(box).toHaveValue('Backfill the 1. missing invoice events')
  })

  it('Task tool, with text selected, inserts the task prefix before the selection', () => {
    const initial = 'Follow up with the design reviewers'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'design reviewers')

    fireEvent.click(screen.getByRole('button', { name: 'Task' }))

    expect(box).toHaveValue('Follow up with the - [ ] design reviewers')
  })

  it('Quote tool, with text selected, inserts the quote prefix before the selection', () => {
    const initial = 'Note: the deploy window moved to Friday'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'deploy window moved to Friday')

    fireEvent.click(screen.getByRole('button', { name: 'Quote' }))

    expect(box).toHaveValue('Note: the > deploy window moved to Friday')
  })

  it('Block code tool, with text selected, wraps the selection in a fenced block', () => {
    const initial = 'Paste the failing migration log'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'failing migration log')

    fireEvent.click(screen.getByRole('button', { name: 'Block code' }))

    expect(box).toHaveValue('Paste the ```\nfailing migration log\n```')
  })

  it('Bold tool, with an empty selection, inserts an empty bold pair at the cursor', () => {
    const initial = 'Summarize the incident timeline'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    moveCursorToEnd(box, initial)

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(box).toHaveValue('Summarize the incident timeline****')
  })

  it('Link tool, with an empty selection, inserts an empty link template at the cursor', () => {
    const initial = 'Document the rollback procedure'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    moveCursorToEnd(box, initial)

    fireEvent.click(screen.getByRole('button', { name: 'Link' }))

    expect(box).toHaveValue('Document the rollback procedure[](https://)')
  })

  it('Block code tool, with an empty selection, inserts an empty fenced block at the cursor', () => {
    const initial = 'Attach the failing migration output'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    moveCursorToEnd(box, initial)

    fireEvent.click(screen.getByRole('button', { name: 'Block code' }))

    expect(box).toHaveValue('Attach the failing migration output```\n\n```')
  })

  it('Bullets tool, with an empty selection, inserts the bullet prefix at the cursor', () => {
    const initial = 'List the remaining review owners'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    moveCursorToEnd(box, initial)

    fireEvent.click(screen.getByRole('button', { name: 'Bullets' }))

    expect(box).toHaveValue('List the remaining review owners- ')
  })

  it('Task tool, with an empty selection, inserts the task prefix at the cursor', () => {
    const initial = 'Track the launch readiness items'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    moveCursorToEnd(box, initial)

    fireEvent.click(screen.getByRole('button', { name: 'Task' }))

    expect(box).toHaveValue('Track the launch readiness items- [ ] ')
  })

  it('Toolbar, in preview mode, hides the formatting tools', () => {
    render(<ControlledEditor initialValue="Draft the migration runbook" />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(
      screen.queryByRole('button', { name: 'Bold' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Write' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('Toolbar, on initial render, exposes every tool by its accessible name', () => {
    render(<ControlledEditor initialValue="Draft the migration runbook" />)

    const tools = [
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

    for (const name of tools) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })
})

describe('MarkdownEditor shortcuts', () => {
  it('Meta+B shortcut, with text selected, wraps the selection in double asterisks', () => {
    const initial = 'Ship the release notes draft'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'release notes')

    fireEvent.keyDown(box, { key: 'b', metaKey: true })

    expect(box).toHaveValue('Ship the **release notes** draft')
  })

  it('Ctrl+I shortcut, with text selected, wraps the selection in single asterisks', () => {
    const initial = 'Draft the migration runbook'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'migration')

    fireEvent.keyDown(box, { key: 'I', ctrlKey: true })

    expect(box).toHaveValue('Draft the *migration* runbook')
  })

  it('Meta+K shortcut, with text selected, wraps the selection in a link template', () => {
    const initial = 'Read the deployment guide'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'deployment guide')

    fireEvent.keyDown(box, { key: 'k', metaKey: true })

    expect(box).toHaveValue('Read the [deployment guide](https://)')
  })

  it('Modified shortcut, with an unrelated key, leaves the value unchanged', () => {
    const initial = 'Draft the migration runbook'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'migration')

    fireEvent.keyDown(box, { key: 'u', metaKey: true })

    expect(box).toHaveValue('Draft the migration runbook')
  })

  it('Unmodified key press, without meta or ctrl, leaves the value unchanged', () => {
    const initial = 'Draft the migration runbook'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, initial, 'migration')

    fireEvent.keyDown(box, { key: 'b' })

    expect(box).toHaveValue('Draft the migration runbook')
  })
})

describe('MarkdownEditor disabled state', () => {
  it('Disabled editor, when a toolbar tool is clicked, leaves the value unchanged', () => {
    render(
      <ControlledEditor
        initialValue="Summarize the incident timeline"
        disabled
      />
    )

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, 'Summarize the incident timeline', 'incident timeline')

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(box).toHaveValue('Summarize the incident timeline')
  })

  it('Disabled editor, when a shortcut is pressed, leaves the value unchanged', () => {
    render(
      <ControlledEditor
        initialValue="Summarize the incident timeline"
        disabled
      />
    )

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    selectWord(box, 'Summarize the incident timeline', 'incident timeline')

    fireEvent.keyDown(box, { key: 'b', metaKey: true })

    expect(box).toHaveValue('Summarize the incident timeline')
  })

  it('Disabled editor, renders the textarea as disabled', () => {
    render(
      <ControlledEditor
        initialValue="Summarize the incident timeline"
        disabled
      />
    )

    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('Disabled editor, renders every toolbar tool as disabled', () => {
    render(
      <ControlledEditor
        initialValue="Summarize the incident timeline"
        disabled
      />
    )

    const tools = [
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

    for (const name of tools) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
  })
})

describe('MarkdownEditor props and controlled value', () => {
  it('Placeholder prop, on render, appears on the textarea', () => {
    render(
      <ControlledEditor
        initialValue=""
        placeholder="Describe the rollout plan"
      />
    )

    expect(
      screen.getByPlaceholderText('Describe the rollout plan')
    ).toBeInTheDocument()
  })

  it('Default minRows, on render, sets five rows on the textarea', () => {
    render(<ControlledEditor initialValue="" />)

    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5')
  })

  it('Custom minRows, on render, sets the rows attribute to the given value', () => {
    render(<ControlledEditor initialValue="" minRows={8} />)

    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8')
  })

  it('Id prop, on render, appears on the textarea', () => {
    render(<ControlledEditor initialValue="" id="release-notes" />)

    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'release-notes')
  })

  it('Name prop, on render, appears on the textarea', () => {
    render(<ControlledEditor initialValue="" name="release-notes" />)

    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'release-notes')
  })

  it('Typing, in the textarea, updates the value through onValueChange', () => {
    const handleChange = vi.fn()
    render(
      <ControlledEditor
        initialValue="Draft the incident"
        onValueChange={handleChange}
      />
    )

    const box = screen.getByRole('textbox') as HTMLTextAreaElement

    fireEvent.change(box, { target: { value: 'Draft the incident timeline' } })

    expect(handleChange).toHaveBeenCalledWith('Draft the incident timeline')
    expect(box).toHaveValue('Draft the incident timeline')
  })

  it('Controlled value, when updated by the parent, shows the new text in the textarea', () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <MarkdownEditor
        value="Draft the incident timeline"
        onValueChange={handleChange}
      />
    )

    expect(screen.getByRole('textbox')).toHaveValue(
      'Draft the incident timeline'
    )

    rerender(
      <MarkdownEditor
        value="Draft the postmortem timeline"
        onValueChange={handleChange}
      />
    )

    expect(screen.getByRole('textbox')).toHaveValue(
      'Draft the postmortem timeline'
    )
  })

  it('Toolbar action, after applying a prefix, keeps the cursor around the wrapped text', () => {
    const queuedFrames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queuedFrames.push(callback)

      return queuedFrames.length
    })

    const initial = 'Ship the release notes draft'
    render(<ControlledEditor initialValue={initial} />)

    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    const { start, end } = selectWord(box, initial, 'release notes')

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    for (const frame of queuedFrames) {
      frame(0)
    }

    expect(box.selectionStart).toBe(start + 2)
    expect(box.selectionEnd).toBe(end + 2)
  })

  it('Preview tab, with bold markdown, renders the emphasized text', () => {
    render(
      <ControlledEditor initialValue="**Freeze the schema** before Friday" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    const strong = screen.getByText('Freeze the schema')

    expect(strong.tagName).toBe('STRONG')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
