'use client'

import { Button } from '@876/ui/button'
import { useState } from 'react'

export type OneTimeSecretProps = {
  secret: string
}

export function OneTimeSecret({ secret }: OneTimeSecretProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section
      data-slot="one-time-secret"
      className="876-card space-y-3 p-5"
      aria-label="New client secret"
    >
      <h3 className="text-sm font-semibold">Client secret created</h3>
      <p className="text-muted-foreground text-sm">
        Copy the secret now — it will not be shown again.
      </p>
      <code
        data-slot="one-time-secret-value"
        className="bg-muted block rounded-md px-3 py-2 font-mono text-sm break-all"
      >
        {secret}
      </code>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void handleCopy()
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </section>
  )
}
