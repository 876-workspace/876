'use client'

import { useRef, useState } from 'react'

import { Button } from './button'
import {
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CodeBracketIcon,
  CommandLineIcon,
  LinkIcon,
  QueueListIcon,
  type IconComponent,
} from '../icons'
import { Markdown } from './markdown'
import { Textarea } from './textarea'

type MarkdownEditorProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  minRows?: number
  disabled?: boolean
  id?: string
  name?: string
}

type MarkdownTool = {
  label: string
  prefix: string
  suffix: string
  icon?: IconComponent
  mark?: string
  markClassName?: string
}

const tools: readonly MarkdownTool[] = [
  {
    label: 'Bold',
    prefix: '**',
    suffix: '**',
    mark: 'B',
    markClassName: 'font-bold',
  },
  {
    label: 'Italic',
    prefix: '*',
    suffix: '*',
    mark: 'I',
    markClassName: 'font-serif italic',
  },
  {
    label: 'Strike',
    prefix: '~~',
    suffix: '~~',
    mark: 'S',
    markClassName: 'line-through',
  },
  { label: 'Code', prefix: '`', suffix: '`', icon: CodeBracketIcon },
  { label: 'Link', prefix: '[', suffix: '](https://)', icon: LinkIcon },
  { label: 'Bullets', prefix: '- ', suffix: '', icon: QueueListIcon },
  {
    label: 'Numbered',
    prefix: '1. ',
    suffix: '',
    icon: ClipboardDocumentListIcon,
  },
  { label: 'Task', prefix: '- [ ] ', suffix: '', icon: CheckCircleIcon },
  { label: 'Quote', prefix: '> ', suffix: '', icon: ChatBubbleLeftIcon },
  {
    label: 'Block code',
    prefix: '```\n',
    suffix: '\n```',
    icon: CommandLineIcon,
  },
]

export function MarkdownEditor({
  value,
  onValueChange,
  placeholder,
  minRows = 5,
  disabled,
  id,
  name,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  function apply(prefix: string, suffix: string) {
    const textarea = textareaRef.current
    if (!textarea || disabled) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`
    onValueChange(next)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return
    const shortcut = event.key.toLowerCase()
    if (shortcut === 'b') apply('**', '**')
    else if (shortcut === 'i') apply('*', '*')
    else if (shortcut === 'k') apply('[', '](https://)')
    else return
    event.preventDefault()
  }

  return (
    <div
      role="group"
      aria-label="Markdown editor"
      data-slot="markdown-editor"
      data-mode={tab}
      className="bg-background border-border/70 focus-within:border-ring focus-within:ring-ring/25 overflow-hidden rounded-xl border shadow-sm transition-[border-color,box-shadow] focus-within:ring-2"
    >
      <div className="bg-muted/30 border-border/60 flex flex-col gap-2 border-b p-2 sm:flex-row sm:items-center">
        <div className="bg-background/70 border-border/60 flex w-fit rounded-lg border p-0.5">
          <Button
            type="button"
            variant={tab === 'write' ? 'secondary' : 'ghost'}
            size="xs"
            aria-pressed={tab === 'write'}
            disabled={disabled}
            onClick={() => setTab('write')}
          >
            Write
          </Button>
          <Button
            type="button"
            variant={tab === 'preview' ? 'secondary' : 'ghost'}
            size="xs"
            aria-pressed={tab === 'preview'}
            disabled={disabled}
            onClick={() => setTab('preview')}
          >
            Preview
          </Button>
        </div>
        {tab === 'write' ? (
          <div className="876-scroll-none border-border/50 flex gap-1 overflow-x-auto sm:ml-auto sm:border-l sm:pl-2">
            {tools.map(
              ({ label, prefix, suffix, icon: Icon, mark, markClassName }) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  aria-label={label}
                  title={label}
                  className="text-muted-foreground hover:text-foreground size-9"
                  onClick={() => apply(prefix, suffix)}
                >
                  {Icon ? (
                    <Icon aria-hidden="true" className="size-3.5" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`text-[11px] ${markClassName ?? ''}`}
                    >
                      {mark}
                    </span>
                  )}
                </Button>
              )
            )}
          </div>
        ) : null}
      </div>
      {tab === 'write' ? (
        <Textarea
          ref={textareaRef}
          id={id}
          name={name}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={minRows}
          disabled={disabled}
          className="bg-background min-h-32 resize-y rounded-none border-0 px-4 py-3 text-base shadow-none focus-visible:ring-0"
        />
      ) : (
        <div className="bg-background min-h-32 px-4 py-3">
          {value ? (
            <Markdown content={value} />
          ) : (
            <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
              Nothing to preview.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
