import type { OutputBlockData } from '@editorjs/editorjs'
import type { ReactNode } from 'react'

import { parseEditorContent } from '../data'

export interface EditorContentProps {
  value: string
  className?: string
}

type ListItem = {
  content?: unknown
  text?: unknown
  meta?: { checked?: unknown } | null
  items?: unknown
}

const SIMPLE_INLINE_TAGS = new Set(['b', 'strong', 'i', 'em', 'u'])
const INLINE_TAG = /<\/?([a-z][a-z0-9]*)([^<>]*)>/gi

function escapeText(value: string) {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function decodeAttribute(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function safeHref(value: string) {
  const href = decodeAttribute(value).trim()
  if (!href) return null
  if (href.startsWith('/') || href.startsWith('#')) return href

  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
      ? href
      : null
  } catch {
    return null
  }
}

/** Keep only Editor.js inline formatting that the platform explicitly supports. */
function sanitizeInlineMarkup(value: string) {
  let output = ''
  let cursor = 0

  for (const match of value.matchAll(INLINE_TAG)) {
    const index = match.index ?? 0
    output += escapeText(value.slice(cursor, index))

    const raw = match[0]
    const tag = match[1]?.toLowerCase() ?? ''
    const attributes = match[2] ?? ''
    const closing = raw.startsWith('</')

    if (SIMPLE_INLINE_TAGS.has(tag)) {
      output += closing ? `</${tag}>` : `<${tag}>`
    } else if (tag === 'br' && !closing) {
      output += '<br>'
    } else if (tag === 'a') {
      if (closing) {
        output += '</a>'
      } else {
        const hrefMatch = attributes.match(
          /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
        )
        const href = safeHref(
          hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? ''
        )

        if (!href) {
          output += '<a>'
        } else {
          const external = /^https?:/i.test(href)
          output += external
            ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">`
            : `<a href="${escapeAttribute(href)}">`
        }
      }
    } else {
      output += escapeText(raw)
    }

    cursor = index + raw.length
  }

  output += escapeText(value.slice(cursor))
  return output
}

function InlineContent({ value }: { value: string }) {
  return (
    <span dangerouslySetInnerHTML={{ __html: sanitizeInlineMarkup(value) }} />
  )
}

function asListItem(value: unknown): ListItem {
  return value && typeof value === 'object' ? (value as ListItem) : {}
}

function listItemContent(item: ListItem) {
  if (typeof item.content === 'string') return item.content
  return typeof item.text === 'string' ? item.text : ''
}

function ListItems({ items, style }: { items: unknown[]; style: string }) {
  const checklist = style === 'checklist'
  const ordered = style === 'ordered'
  const Root = ordered ? 'ol' : 'ul'

  return (
    <Root
      className={
        checklist
          ? 'space-y-1.5'
          : ordered
            ? 'list-decimal space-y-1 pl-5'
            : 'list-disc space-y-1 pl-5'
      }
    >
      {items.map((rawItem, index) => {
        const item = asListItem(rawItem)
        const children = Array.isArray(item.items) ? item.items : []

        return (
          <li
            key={index}
            className={checklist ? 'flex items-start gap-2' : undefined}
          >
            {checklist ? (
              <input
                type="checkbox"
                checked={item.meta?.checked === true}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="border-input mt-1 size-4 shrink-0 rounded"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <InlineContent value={listItemContent(item)} />
              {children.length > 0 ? (
                <ListItems items={children} style={style} />
              ) : null}
            </div>
          </li>
        )
      })}
    </Root>
  )
}

function renderBlock(block: OutputBlockData, index: number): ReactNode {
  const data = (block.data ?? {}) as Record<string, unknown>
  const key = block.id ?? `${block.type}-${index}`

  if (block.type === 'paragraph') {
    const text = typeof data.text === 'string' ? data.text : ''
    return (
      <p key={key} className="min-h-5 break-words">
        <InlineContent value={text} />
      </p>
    )
  }

  if (block.type === 'header') {
    const text = typeof data.text === 'string' ? data.text : ''
    const level = data.level === 3 ? 3 : 2
    return level === 3 ? (
      <h3 key={key} className="text-base font-semibold tracking-tight">
        <InlineContent value={text} />
      </h3>
    ) : (
      <h2 key={key} className="text-lg font-semibold tracking-tight">
        <InlineContent value={text} />
      </h2>
    )
  }

  if (block.type === 'list') {
    const items = Array.isArray(data.items) ? data.items : []
    const style = typeof data.style === 'string' ? data.style : 'unordered'
    return <ListItems key={key} items={items} style={style} />
  }

  if (block.type === 'quote') {
    const text = typeof data.text === 'string' ? data.text : ''
    return (
      <blockquote key={key} className="border-border border-l-2 pl-3 italic">
        <InlineContent value={text} />
      </blockquote>
    )
  }

  if (typeof data.text === 'string') {
    return (
      <p key={key} className="break-words">
        <InlineContent value={data.text} />
      </p>
    )
  }

  return null
}

/** Render Editor.js content as lightweight React instead of mounting read-only instances. */
export function EditorContent({ value, className }: EditorContentProps) {
  const blocks = parseEditorContent(value).blocks

  return (
    <div
      className={['editor-content space-y-2 text-sm leading-relaxed', className]
        .filter(Boolean)
        .join(' ')}
    >
      {blocks.map(renderBlock)}
    </div>
  )
}
