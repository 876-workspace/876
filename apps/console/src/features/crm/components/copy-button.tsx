'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckIcon, Copy } from '@876/ui/icons'
import { cn } from '@876/core/utils'

export function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy(event: React.MouseEvent) {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copied`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label.toLowerCase()}`}
      className={cn(
        'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-6 items-center justify-center rounded-md transition-colors',
        className
      )}
      aria-label={`Copy ${label.toLowerCase()}`}
    >
      {copied ? (
        <CheckIcon className="text-primary size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
    </button>
  )
}
