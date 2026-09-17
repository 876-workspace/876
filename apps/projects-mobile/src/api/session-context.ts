import { useMemo } from 'react'

import { useSession } from '../auth/session'
import { createSessionClient } from './client'
import type { SessionContext } from './hooks'

export function useSessionContext(): SessionContext | null {
  const { status, accessToken, organizationId, userId } = useSession()
  return useMemo(() => {
    if (
      status !== 'signed-in' ||
      !accessToken ||
      !organizationId ||
      !userId
    )
      return null
    return {
      organizationId,
      userId,
      client: createSessionClient(accessToken),
    }
  }, [status, accessToken, organizationId, userId])
}
