'use client'

import { useEffect } from 'react'

import type { AnalyticsRawProperties } from '@/types/analytics'
import { useConsoleUser } from '@/stores/user'

import type { AnalyticsEventName } from '@/types/analytics'
import { track } from './track'

export function TrackMCEventOnMount({
  event,
  properties,
}: {
  event: AnalyticsEventName
  properties?: AnalyticsRawProperties
}) {
  const user = useConsoleUser()

  useEffect(() => {
    if (!user) return

    track(event, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        firstName: user.name.split(' ')[0] ?? null,
        lastName: user.name.split(' ').slice(1).join(' ') || null,
        avatar: user.avatar,
        status: null,
        emailVerified: null,
      },
      properties: {
        actor_user_id: user.id,
        viewer_user_id: user.id,
        ...properties,
      },
    })
  }, [event, properties, user])

  return null
}
