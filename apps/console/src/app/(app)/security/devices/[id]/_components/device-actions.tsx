'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@876/ui/button'
import { client } from '@/lib/client'

type Props = {
  deviceId: string
  trusted: boolean
  blocked: boolean
}

export function DeviceActions({ deviceId, trusted, blocked }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function apply(params: { trusted?: boolean; blocked?: boolean }) {
    setError(null)
    startTransition(async () => {
      const result = await client.devices.update(deviceId, params)
      if (result.error) setError(result.error.message)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => apply({ trusted: !trusted })}
        >
          {trusted ? 'Untrust' : 'Trust'}
        </Button>
        <Button
          variant={blocked ? 'outline' : 'destructive'}
          size="sm"
          disabled={isPending}
          onClick={() => apply({ blocked: !blocked })}
        >
          {blocked ? 'Unblock' : 'Block'}
        </Button>
      </div>
      {error && <p className="text-destructive text-[0.8125rem]">{error}</p>}
    </div>
  )
}
