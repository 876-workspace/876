import { Redirect, Stack } from 'expo-router'

import { useSession } from '../../src/auth/session'

export default function AppLayout() {
  const { status, organizationId } = useSession()

  if (status === 'signed-out') return <Redirect href="/sign-in" />
  if (status === 'signed-in' && !organizationId)
    return <Redirect href="/sign-in" />
  if (status !== 'signed-in') return null

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="projects/[projectId]"
        options={{ title: 'Project' }}
      />
      <Stack.Screen name="issues/new" options={{ title: 'New issue' }} />
      <Stack.Screen name="issues/[issueRef]" options={{ title: 'Issue' }} />
      <Stack.Screen
        name="issues/[issueRef]/edit"
        options={{ title: 'Edit issue' }}
      />
    </Stack>
  )
}
