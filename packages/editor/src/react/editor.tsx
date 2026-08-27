'use client'

import type EditorJS from '@editorjs/editorjs'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type FocusEvent,
} from 'react'

import { parseEditorContent, serializeEditorContent } from '../data'
import { EDITORJS_THEME_CSS } from './theme'

export interface EditorHandle {
  flush(): Promise<string>
  focus(): Promise<void>
}

export interface EditorProps {
  initialValue: string
  onChange: (serializedContent: string) => void
  id?: string
  ariaLabel?: string
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  minHeight?: number
  className?: string
  holderClassName?: string
}

/**
 * Shared block editor used by authored 876 content.
 *
 * The instance mounts once. Consumers should change `key` to start a fresh
 * editing session when the backing record changes or a composer is cleared.
 */
export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    initialValue,
    onChange,
    id,
    ariaLabel = 'Rich text editor',
    placeholder = 'Write something…',
    autoFocus = false,
    disabled = false,
    minHeight = 140,
    className,
    holderClassName,
  },
  ref
) {
  const holderRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorJS | null>(null)
  const onChangeRef = useRef(onChange)
  const disabledRef = useRef(disabled)
  const latestValueRef = useRef(initialValue)

  onChangeRef.current = onChange
  disabledRef.current = disabled

  useImperativeHandle(ref, () => ({
    async flush() {
      const instance = editorRef.current
      if (!instance) return latestValueRef.current

      try {
        await instance.isReady
        const value = serializeEditorContent(await instance.save())
        latestValueRef.current = value
        onChangeRef.current(value)
        return value
      } catch {
        return latestValueRef.current
      }
    },
    async focus() {
      const instance = editorRef.current
      if (!instance) {
        holderRef.current?.focus()
        return
      }

      try {
        await instance.isReady
        instance.caret.focus(true)
      } catch {
        holderRef.current?.focus()
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
      ] = await Promise.all([
        import('@editorjs/editorjs'),
        import('@editorjs/header'),
        import('@editorjs/list'),
        import('@editorjs/underline'),
      ])

      if (cancelled || !holderRef.current) return

      editor = new EditorJSCtor({
        holder: holderRef.current,
        data: parseEditorContent(initialValue),
        autofocus: autoFocus,
        placeholder,
        minHeight,
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
          underline: Underline,
        },
        inlineToolbar: ['bold', 'italic', 'underline', 'link'],
        onChange: async (api) => {
          if (cancelled) return

          try {
            const data = await api.saver.save()
            if (cancelled) return

            const value = serializeEditorContent(data)
            latestValueRef.current = value
            onChangeRef.current(value)
          } catch {
            // Ignore save races while an instance is tearing down.
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
        .then(() => instance.destroy())
        .catch(() => {
          try {
            instance.destroy()
          } catch {
            // The instance was already destroyed.
          }
        })
    }
    // Initial editor configuration is fixed for one mounted editing session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const instance = editorRef.current
    if (!instance) return

    void instance.isReady
      .then(() => instance.readOnly.toggle(Boolean(disabled)))
      .catch(() => {
        // The instance may already be destroyed.
      })
  }, [disabled])

  function handleHolderFocus(event: FocusEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    void editorRef.current?.isReady.then(() => editorRef.current?.caret.focus(true))
  }

  return (
    <div
      className={[
        'editorjs min-h-0 min-w-0 overflow-x-visible',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <style>{EDITORJS_THEME_CSS}</style>
      <div
        ref={holderRef}
        id={id}
        tabIndex={-1}
        onFocus={handleHolderFocus}
        aria-label={ariaLabel}
        className={[
          'editorjs-holder min-h-[8rem] text-sm leading-6',
          holderClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  )
})
