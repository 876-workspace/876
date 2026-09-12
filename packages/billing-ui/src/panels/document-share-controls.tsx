'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { ChevronDownIcon, Copy, DocumentTextIcon, Printer } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'

const COPY_CONFIRMATION_MS = 2000

export interface DocumentShareControlsProps {
  /**
   * The document's path in the host app. Resolved against
   * `window.location.origin` on use, so the copied link is one the recipient
   * can actually open.
   */
  sharePath: string
  /** What the caller could not copy, e.g. "invoice" or "quote". */
  documentLabel?: string
  disabled?: boolean
}

/**
 * Share and PDF/Print: the two document controls that depend on neither the
 * document's status nor the viewer's permissions. Anyone who can open a
 * document can copy its link and print it, so these are deliberately ungated —
 * a quote that has been accepted and an invoice that has been paid both still
 * need them.
 */
export function DocumentShareControls({
  sharePath,
  documentLabel = 'document',
  disabled = false,
}: DocumentShareControlsProps) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const copyLink = useCallback(async () => {
    const url = new URL(sharePath, window.location.origin).toString()
    try {
      await navigator.clipboard?.writeText(url)
    } catch {
      // A denied clipboard permission is an ordinary browser state, not a
      // failure worth escalating — tell the reader where the link is instead.
      setError(`Copy the ${documentLabel} link from the address bar.`)
      setCopied(false)
      return
    }
    setError(null)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS)
  }, [documentLabel, sharePath])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => void copyLink()}
        aria-live="polite"
      >
        <Copy className="size-4" />
        {copied ? 'Copied' : 'Share'}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: 'ghost' }))}
          aria-label="PDF/Print"
        >
          <Printer className="size-4" />
          PDF/Print
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-64">
          <DropdownMenuItem onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => window.print()}
            className="flex-col items-start gap-1"
          >
            <span className="flex items-center gap-2">
              <DocumentTextIcon className="size-4" />
              Save as PDF
            </span>
            <span className="text-muted-foreground pl-6 text-xs">
              Choose “Save as PDF” in the browser print dialog
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </>
  )
}
