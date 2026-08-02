'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@876/ui/button'
import { CheckIcon, Copy } from '@876/ui/icons'

export function CopyableAddressLine({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current)
    },
    []
  )

  async function copyLine() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)

      if (timeout.current) clearTimeout(timeout.current)
      timeout.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="group flex min-w-0 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">
          {label}
        </div>
        <div className="mt-0.5 truncate font-medium">{value}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void copyLine()}
        aria-label={`Copy ${label.toLowerCase()}`}
        title={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
      >
        {copied ? (
          <CheckIcon className="text-primary size-4" />
        ) : (
          <Copy className="text-muted-foreground size-4" />
        )}
      </Button>
    </div>
  )
}
