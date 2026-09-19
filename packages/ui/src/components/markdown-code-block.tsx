'use client'

import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react'

import { Button } from './button'

type CodeElementProps = {
  children?: ReactNode
  className?: string
}

type MarkdownCodeBlockProps = ComponentProps<'pre'> & { node?: unknown }

function isCodeElement(
  node: ReactNode
): node is ReactElement<CodeElementProps> {
  return isValidElement<CodeElementProps>(node) && node.type === 'code'
}

function getTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getTextContent).join('')
  if (isValidElement<CodeElementProps>(node))
    return getTextContent(node.props.children)

  return ''
}

function languageFromClassName(className?: string) {
  if (!className?.split(' ').includes('hljs')) return undefined

  return className
    ?.split(' ')
    .find((className) => className.startsWith('language-'))
    ?.slice('language-'.length)
}

function hasHighlightTokens(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(hasHighlightTokens)
  if (!isValidElement<CodeElementProps>(node)) return false
  if (
    node.props.className
      ?.split(' ')
      .some((className) => className.startsWith('hljs-'))
  )
    return true

  return hasHighlightTokens(node.props.children)
}

export function MarkdownCodeBlock({
  children,
  node: _node,
  ...props
}: MarkdownCodeBlockProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  )
  const code = Children.toArray(children).find(isCodeElement)
  const language = hasHighlightTokens(code?.props.children)
    ? languageFromClassName(code?.props.className)
    : undefined
  const text = getTextContent(code?.props.children)

  useEffect(() => {
    if (copyState === 'idle') return

    const timeout = window.setTimeout(() => setCopyState('idle'), 2_000)
    return () => window.clearTimeout(timeout)
  }, [copyState])

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  const copyLabel =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'failed'
        ? 'Copy failed'
        : 'Copy'

  return (
    <div className="bg-muted relative -mx-4 my-3 overflow-x-auto rounded-none px-4 py-3 sm:mx-0 sm:rounded-md sm:px-0">
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {language ? (
          <span className="text-muted-foreground text-xs">{language}</span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Copy code"
          className="bg-background/70 text-muted-foreground hover:text-foreground size-9 text-xs"
          onClick={() => void copy()}
        >
          {copyLabel}
        </Button>
      </div>
      <pre {...props} className="pr-16 sm:px-4 sm:pr-16">
        {children}
      </pre>
      {copyState === 'failed' ? (
        <span role="status" className="text-destructive mt-2 block text-xs">
          Couldn&apos;t copy code. Try again.
        </span>
      ) : null}
    </div>
  )
}
