'use client'

import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { client } from '@/lib/client'

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (deleting) return
    if (!window.confirm('Remove this customer from CRM?')) return

    setDeleting(true)
    setError(null)
    const result = await client.customers.delete(customerId)
    if (result.error) {
      setError(result.error.message)
      setDeleting(false)
      return
    }

    router.replace('/customers')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="destructive" onClick={remove} disabled={deleting}>
        {deleting ? 'Removing…' : 'Remove from CRM'}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}
