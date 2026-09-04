'use client'

import { useRef, useState } from 'react'

import { Button } from './button'
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

const tools = [
  ['Bold', '**', '**'],
  ['Italic', '*', '*'],
  ['Strike', '~~', '~~'],
  ['Code', '`', '`'],
  ['Link', '[', '](https://)'],
  ['Bullets', '- ', ''],
  ['Numbered', '1. ', ''],
  ['Task', '- [ ] ', ''],
  ['Quote', '> ', ''],
  ['Block code', '```\n', '\n```'],
] as const

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
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="bg-muted/40 border-border flex items-center gap-1 border-b px-2 py-1.5">
        <Button
          type="button"
          variant={tab === 'write' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => setTab('write')}
        >
          Write
        </Button>
        <Button
          type="button"
          variant={tab === 'preview' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => setTab('preview')}
        >
          Preview
        </Button>
        {tab === 'write' ? (
          <div className="ml-auto flex flex-wrap gap-0.5">
            {tools.map(([label, prefix, suffix]) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                aria-label={label}
                title={label}
                onClick={() => apply(prefix, suffix)}
              >
                <span className="text-[10px] font-semibold">
                  {label.slice(0, 2)}
                </span>
              </Button>
            ))}
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
          className="min-h-32 resize-y rounded-none border-0 focus-visible:ring-0"
        />
      ) : (
        <div className="min-h-32 px-3 py-2">
          {value ? (
            <Markdown content={value} />
          ) : (
            <span className="text-muted-foreground text-sm">
              Nothing to preview.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
