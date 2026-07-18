'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Eye, EyeOff, KeyRound, Plus } from '@876/ui/icons'
import { Button } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@876/ui/dialog'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'

export function CreateApiKeyDialog({ appId }: { appId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyVisible, setKeyVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setExpiresAt('')
    setCreatedKey(null)
    setKeyVisible(false)
    setCopied(false)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
      if (createdKey) router.refresh()
    }
    setOpen(next)
  }

  function handleCreate() {
    startTransition(async () => {
      setError(null)
      const expiresAtSeconds = expiresAt
        ? Math.floor(new Date(expiresAt).getTime() / 1000)
        : undefined

      const { data, error: err } = await client.apiKeys.create(appId, {
        name: name.trim() || undefined,
        expires_at: Number.isFinite(expiresAtSeconds)
          ? expiresAtSeconds
          : undefined,
      })
      if (err || !data) {
        setError(err?.message ?? 'Failed to create API key.')
        return
      }
      setCreatedKey(data.key)
    })
  }

  async function handleCopy() {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" variant="info">
            <Plus className="mr-1.5 size-3.5" />
            New key
          </Button>
        }
      />

      <DialogContent>
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give the key an optional name so you can identify it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-key-name">Name (optional)</Label>
                <Input
                  id="new-key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production server"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-key-expiration">
                  Expiration (optional)
                </Label>
                <Input
                  id="new-key-expiration"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="info" onClick={handleCreate} disabled={pending}>
                Create
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-blue-600 dark:text-blue-400" />
                API key created
              </DialogTitle>
              <DialogDescription>
                Copy and store this key now — it will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-muted flex-1 overflow-hidden rounded-md border px-3 py-2 font-mono text-xs">
                  {keyVisible
                    ? createdKey
                    : '•'.repeat(Math.min(createdKey.length, 40))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setKeyVisible((v) => !v)}
                  aria-label={keyVisible ? 'Hide key' : 'Show key'}
                >
                  {keyVisible ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy key"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-muted-foreground text-xs">
                  Copied to clipboard.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="info" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
