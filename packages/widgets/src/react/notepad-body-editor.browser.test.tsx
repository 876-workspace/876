import { useRef, useState } from 'react'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { describe, expect, it } from 'vitest'

import type { NotepadBodyEditorHandle } from '../types/notepad'
import { NotepadBodyEditor } from './notepad-body-editor'
import { getNotePlainText, serializeNoteBody } from './notepad-editor-data'

const initialBody = serializeNoteBody({
  blocks: [
    {
      type: 'paragraph',
      data: { text: 'Browser-backed note' },
    },
  ],
})

function EditorHarness() {
  const editorRef = useRef<NotepadBodyEditorHandle>(null)
  const [serialized, setSerialized] = useState(initialBody)
  const [flushedText, setFlushedText] = useState('')

  return (
    <main style={{ width: 640, minHeight: 360, padding: 24 }}>
      <NotepadBodyEditor
        ref={editorRef}
        initialBody={initialBody}
        onChange={setSerialized}
      />
      <button
        type="button"
        onClick={async () => {
          const body = (await editorRef.current?.flush()) ?? serialized
          setFlushedText(getNotePlainText(body))
        }}
      >
        Flush editor
      </button>
      <output aria-label="Flushed note">{flushedText}</output>
    </main>
  )
}

describe('Notepad Editor.js browser integration', () => {
  it('when a user edits rich text, flushes the real browser editor into the persisted format', async () => {
    render(<EditorHarness />)

    const paragraph = page.getByText('Browser-backed note')
    await expect.element(paragraph).toBeVisible()
    await paragraph.click()
    await userEvent.keyboard('{End} from Chromium')
    await page.getByRole('button', { name: 'Flush editor' }).click()

    await expect
      .element(page.getByLabelText('Flushed note'))
      .toHaveTextContent('Browser-backed note from Chromium')
  })
})
