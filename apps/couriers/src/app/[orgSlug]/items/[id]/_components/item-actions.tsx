'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@876/ui/button'
import { client } from '@/lib/client'

export function ItemActions({
  orgSlug,
  itemId,
  isActive,
}: {
  orgSlug: string
  itemId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`/${orgSlug}/items/${itemId}/edit`} />}
      >
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await client.items.update(orgSlug, itemId, {
              isActive: !isActive,
            })
            if (!result.error) router.refresh()
          })
        }
      >
        {isActive ? 'Archive' : 'Restore'}
      </Button>
    </div>
  )
}
