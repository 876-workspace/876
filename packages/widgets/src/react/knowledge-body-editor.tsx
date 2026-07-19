'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type EditorJS from '@editorjs/editorjs'
import type { ToolConstructable, ToolSettings } from '@editorjs/editorjs'
import { cn } from '@876/core/utils'

import {
  parseKnowledgeBody,
  serializeKnowledgeBody,
} from './knowledge-editor-data'

export type KnowledgeBodyEditorHandle = {
  flush: () => Promise<string>
}

type Props = {
  initialBody: string
  readOnly?: boolean
  /** When set, enables image upload via this endpoint (Console authoring). */
  imageUploadUrl?: string
  onChange?: (serializedBody: string) => void
  className?: string
  placeholder?: string
}

/**
 * Knowledge Base body editor powered by Editor.js with an expanded tool set.
 * Use readOnly for the widget reader; full tools + image upload for Console.
 */
export const KnowledgeBodyEditor = forwardRef<KnowledgeBodyEditorHandle, Props>(
  function KnowledgeBodyEditor(
    {
      initialBody,
      readOnly = false,
      imageUploadUrl,
      onChange,
      className,
      placeholder = 'Write the article…',
    },
    ref
  ) {
    const holderRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<EditorJS | null>(null)
    const onChangeRef = useRef(onChange)
    const latestBodyRef = useRef(initialBody)
    onChangeRef.current = onChange

    useImperativeHandle(ref, () => ({
      async flush() {
        const instance = editorRef.current
        if (!instance) return latestBodyRef.current
        try {
          await instance.isReady
          const body = serializeKnowledgeBody(await instance.save())
          latestBodyRef.current = body
          onChangeRef.current?.(body)
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
          { default: Checklist },
          { default: Quote },
          { default: Delimiter },
          { default: Code },
          { default: Warning },
          { default: Table },
          { default: Marker },
          { default: InlineCode },
          { default: Embed },
          imageModule,
        ] = await Promise.all([
          import('@editorjs/editorjs'),
          import('@editorjs/header'),
          import('@editorjs/list'),
          import('@editorjs/underline'),
          import('@editorjs/checklist'),
          import('@editorjs/quote'),
          import('@editorjs/delimiter'),
          import('@editorjs/code'),
          import('@editorjs/warning'),
          import('@editorjs/table'),
          import('@editorjs/marker'),
          import('@editorjs/inline-code'),
          import('@editorjs/embed'),
          import('@editorjs/image'),
        ])

        if (cancelled || !holderRef.current) return

        // Editor.js tool packages often lack accurate constructable typings.
        const asTool = (tool: unknown) => tool as ToolConstructable
        const tools: Record<string, ToolConstructable | ToolSettings> = {
          header: {
            class: asTool(Header),
            inlineToolbar: ['bold', 'italic', 'underline', 'marker', 'link'],
            config: { levels: [2, 3, 4], defaultLevel: 2 },
          },
          list: {
            class: asTool(EditorjsList),
            inlineToolbar: ['bold', 'italic', 'underline', 'marker', 'link'],
            config: { defaultStyle: 'unordered' },
          },
          checklist: {
            class: asTool(Checklist),
            inlineToolbar: ['bold', 'italic', 'underline', 'marker'],
          },
          quote: {
            class: asTool(Quote),
            inlineToolbar: true,
            config: {
              quotePlaceholder: 'Enter a quote',
              captionPlaceholder: 'Caption',
            },
          },
          warning: {
            class: asTool(Warning),
            inlineToolbar: true,
            config: {
              titlePlaceholder: 'Title',
              messagePlaceholder: 'Message',
            },
          },
          delimiter: asTool(Delimiter),
          code: asTool(Code),
          table: {
            class: asTool(Table),
            inlineToolbar: true,
          },
          embed: {
            class: asTool(Embed),
            config: {
              services: {
                youtube: true,
                vimeo: true,
                codepen: true,
              },
            },
          },
          underline: asTool(Underline),
          marker: asTool(Marker),
          inlineCode: asTool(InlineCode),
        }

        if (imageUploadUrl && !readOnly) {
          tools.image = {
            class: asTool(imageModule.default),
            config: {
              endpoints: {
                byFile: imageUploadUrl,
              },
              field: 'file',
              types: 'image/*',
            },
          }
        } else {
          tools.image = {
            class: asTool(imageModule.default),
            config: {
              // Read-only / no upload: still render existing image blocks.
              endpoints: { byFile: '' },
            },
          }
        }

        editor = new EditorJSCtor({
          holder: holderRef.current,
          data: parseKnowledgeBody(initialBody),
          autofocus: false,
          placeholder,
          minHeight: readOnly ? 0 : 180,
          readOnly,
          tools,
          inlineToolbar: [
            'bold',
            'italic',
            'underline',
            'marker',
            'inlineCode',
            'link',
          ],
          onChange: async (api) => {
            if (cancelled || readOnly) return
            try {
              const data = await api.saver.save()
              if (cancelled) return
              const body = serializeKnowledgeBody(data)
              latestBodyRef.current = body
              onChangeRef.current?.(body)
            } catch {
              // Ignore teardown races.
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
              // ignore
            }
          })
      }
      // Mount once per initial body key — parent should set key={articleId}.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <div className={cn('knowledge-body-editor min-w-0', className)}>
        <div ref={holderRef} className="knowledge-editorjs-holder" />
      </div>
    )
  }
)
