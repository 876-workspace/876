'use client'

import { Editor, type EditorHandle } from '@876/editor/react'
import { forwardRef, useImperativeHandle, useRef } from 'react'

import type { NotepadBodyEditorHandle } from '../types/notepad'

/** Sticky-note presentation wrapper around the platform Editor.js surface. */
export const NotepadBodyEditor = forwardRef<
  NotepadBodyEditorHandle,
  {
    initialBody: string
    autoFocus?: boolean
    disabled?: boolean
    onChange: (serializedBody: string) => void
    className?: string
  }
>(function NotepadBodyEditor(
  { initialBody, autoFocus = false, disabled = false, onChange, className },
  ref
) {
  const editorRef = useRef<EditorHandle>(null)

  useImperativeHandle(ref, () => ({
    flush: () => editorRef.current?.flush() ?? Promise.resolve(initialBody),
  }))

  return (
    <Editor
      ref={editorRef}
      initialValue={initialBody}
      onChange={onChange}
      placeholder="Write something…"
      ariaLabel="Note body"
      autoFocus={autoFocus}
      disabled={disabled}
      minHeight={140}
      className={[
        'mt-3 min-h-0 flex-1 overflow-x-visible overflow-y-auto',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      holderClassName="h-full min-h-[10rem] text-sm leading-6"
    />
  )
})
