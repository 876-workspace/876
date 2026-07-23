'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type EditorJS from '@editorjs/editorjs'
import type { ToolConstructable } from '@editorjs/editorjs'
import { cn } from '@876/core/utils'

import { parseNoteBody, serializeNoteBody } from './notepad-editor-data'
import { NOTEPAD_EDITORJS_THEME_CSS } from './notepad-editorjs-theme'
import type { NotepadBodyEditorHandle } from '../types/notepad'

/**
 * Sticky-note body editor powered by Editor.js.
 * Mount once per note (`key={entryId}` on the parent) so draft state resets cleanly.
 */
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
  const holderRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorJS | null>(null)
  const onChangeRef = useRef(onChange)
  const disabledRef = useRef(disabled)
  const latestBodyRef = useRef(initialBody)
  onChangeRef.current = onChange
  disabledRef.current = disabled

  useImperativeHandle(ref, () => ({
    async flush() {
      const instance = editorRef.current
      if (!instance) return latestBodyRef.current

      try {
        await instance.isReady
        const body = serializeNoteBody(await instance.save())
        latestBodyRef.current = body
        onChangeRef.current(body)
        return body
      } catch {
        return latestBodyRef.current
      }
    },
  }))

  useEffect(() => {
    const holder = holderRef.current
    if (!holder) return

    let cancelled = false
    let editor: EditorJS | null = null

    async function mount() {
      const [
        { default: EditorJSCtor },
        { default: Header },
        { default: EditorjsList },
        { default: Underline },
        checklistModule,
      ] = await Promise.all([
        import('@editorjs/editorjs'),
        import('@editorjs/header'),
        import('@editorjs/list'),
        import('@editorjs/underline'),
        // Host apps that typecheck this source may not pick up ambient d.ts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        import('@editorjs/checklist' as any) as Promise<{
          default: ToolConstructable
        }>,
      ])
      const Checklist = checklistModule.default

      if (cancelled || !holderRef.current) return

      editor = new EditorJSCtor({
        holder: holderRef.current,
        data: parseNoteBody(initialBody),
        autofocus: autoFocus,
        placeholder: 'Write something…',
        minHeight: 140,
        readOnly: disabledRef.current,
        tools: {
          header: {
            class: Header,
            inlineToolbar: ['bold', 'italic', 'underline', 'link'],
            config: {
              levels: [2, 3],
              defaultLevel: 2,
            },
          },
          list: {
            class: EditorjsList,
            inlineToolbar: ['bold', 'italic', 'underline', 'link'],
            config: {
              defaultStyle: 'unordered',
            },
          },
          checklist: {
            class: Checklist,
            inlineToolbar: ['bold', 'italic', 'underline'],
          },
          underline: Underline,
        },
        inlineToolbar: ['bold', 'italic', 'underline', 'link'],
        onChange: async (api) => {
          if (cancelled) return
          try {
            const data = await api.saver.save()
            if (cancelled) return
            const body = serializeNoteBody(data)
            latestBodyRef.current = body
            onChangeRef.current(body)
          } catch {
            // Ignore save races while the instance is tearing down.
          }
        },
      })

      await editor.isReady
      if (cancelled) {
        editor.destroy()
        editor = null
        return
      }

      editorRef.current = editor
      if (disabledRef.current) editor.readOnly.toggle(true)
    }

    void mount()

    return () => {
      cancelled = true
      const instance = editorRef.current ?? editor
      editorRef.current = null
      if (!instance) return
      void instance.isReady
        .then(() => {
          instance.destroy()
        })
        .catch(() => {
          try {
            instance.destroy()
          } catch {
            // already destroyed
          }
        })
    }
    // Initial values are intentionally fixed for this mount; the parent remounts
    // the editor for each note-editing session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const instance = editorRef.current
    if (!instance) return
    void instance.isReady
      .then(() => {
        instance.readOnly.toggle(Boolean(disabled))
      })
      .catch(() => {
        // Instance may already be destroyed.
      })
  }, [disabled])

  return (
    <div
      className={cn(
        // overflow-y scrolls long notes; popovers use high z-index + solid
        // panels so toolbox/settings stay readable over sticky-note ink.
        'notepad-editorjs mt-3 min-h-0 flex-1 overflow-x-visible overflow-y-auto',
        className
      )}
    >
      <style>{NOTEPAD_EDITORJS_THEME_CSS}</style>
      <div
        ref={holderRef}
        aria-label="Note body"
        className="notepad-editorjs-holder h-full min-h-[10rem] text-sm leading-6"
      />
    </div>
  )
})
