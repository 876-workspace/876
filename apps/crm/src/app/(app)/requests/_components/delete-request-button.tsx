'use client'

import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { client } from '@/lib/client'

export function DeleteRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (deleting) return
    if (!window.confirm('Delete this request?')) return

    setDeleting(true)
    setError(null)
    const result = await client.requests.delete(requestId)
    if (result.error) {
      setError(result.error.message)
      setDeleting(false)
      return
    }

    router.replace('/requests')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        onClick={remove}
        disabled={deleting}
      >
        {deleting ? 'Deleting…' : 'Delete'}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}
