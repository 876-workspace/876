import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { createQueryClient, wireQueryLifecycle } from '../src/api/client'
import { SessionProvider } from '../src/auth/session'

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), [])

  useEffect(() => wireQueryLifecycle(), [])

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="sign-in" />
          </Stack>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
