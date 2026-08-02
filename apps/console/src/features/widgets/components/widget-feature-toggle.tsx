'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@876/ui/switch'
import { toast } from 'sonner'

import { client } from '@/lib/client'

export function WidgetFeatureToggle({
  feature,
}: {
  feature: { id: string; name: string; enabled: boolean }
}) {
  const router = useRouter()
  const [optimisticState, setOptimisticState] = useState({
    source: feature.enabled,
    value: feature.enabled,
  })
  const [pending, setPending] = useState(false)
  const enabled =
    optimisticState.source === feature.enabled
      ? optimisticState.value
      : feature.enabled

  async function toggle(next: boolean) {
    if (pending) return
    const previous = enabled
    setOptimisticState({ source: feature.enabled, value: next })
    setPending(true)
    const { error } = await client.widgets.updateFeature(feature.id, {
      enabled: next,
    })
    setPending(false)
    if (error) {
      setOptimisticState({ source: feature.enabled, value: previous })
      toast.error(error.message)
      return
    }
    toast.success(`${feature.name} ${next ? 'enabled' : 'disabled'}.`)
    router.refresh()
  }

  return (
    <Switch
      checked={enabled}
      onCheckedChange={toggle}
      disabled={pending}
      aria-label={`Toggle ${feature.name}`}
    />
  )
}
