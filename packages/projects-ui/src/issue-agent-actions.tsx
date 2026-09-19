'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { Copy, MoreHorizontalIcon } from '@876/ui/icons'
import { useState, type ReactElement } from 'react'

import { formatAgentPrompt } from '@876/projects/agent-brief'

export function IssueAgentActions({
  issueRef,
  brief,
  issueUrl,
}: {
  issueRef: string
  brief: string
  issueUrl: string
}): ReactElement {
  const [copyError, setCopyError] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const title = brief.split('\n', 1)[0]?.replace(/^# [^—]+ — /, '') ?? issueRef
  const prompt = formatAgentPrompt({ identifier: issueRef, title })

  async function copy(label: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setCopyError(false)
    } catch {
      setCopied(null)
      setCopyError(true)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors"
          aria-label="Agent copy options"
        >
          <Copy className="size-4" />
          {copied ?? 'Copy for agent'}
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onClick={() => void copy('Copied for agent', prompt)}
          >
            Copy for agent
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copy('Copied ref', issueRef)}>
            Copy ref
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copy('Copied link', issueUrl)}>
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void copy('Copied full brief', brief)}
            className="flex flex-col items-start gap-0.5"
          >
            <span>Copy full brief</span>
            <span className="text-muted-foreground text-xs">
              For an agent without MCP access
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {copyError ? (
        <span role="alert" className="text-destructive text-xs">
          Could not copy. Try again.
        </span>
      ) : null}
    </div>
  )
}
