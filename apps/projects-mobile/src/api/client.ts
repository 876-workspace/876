import { onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { AppState, type AppStateStatus } from 'react-native'
import { focusManager, QueryClient } from '@tanstack/react-query'
import { create876ProjectsSessionClient } from '@876/projects/session'

import { PROJECTS_API_URL } from '../constants'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 30 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    },
  })
}

export function wireQueryLifecycle(): () => void {
  const subscription = AppState.addEventListener(
    'change',
    (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active')
    }
  )
  let stopNetwork: (() => void) | undefined
  onlineManager.setEventListener((setOnline) => {
    stopNetwork = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? true)
    })
    return () => stopNetwork?.()
  })
  return () => {
    subscription.remove()
    stopNetwork?.()
  }
}

export function createSessionClient(accessToken: string) {
  return create876ProjectsSessionClient({
    baseUrl: PROJECTS_API_URL,
    accessToken,
  })
}
