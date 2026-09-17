import { Link } from 'expo-router'
import { FlatList, Text, View } from 'react-native'

import { flattenPages, useIssues, useMyWork } from '../../../src/api/hooks'
import { useSessionContext } from '../../../src/api/session-context'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../src/components/states'

export default function HomeScreen() {
  const session = useSessionContext()
  if (!session) return <LoadingState label="Preparing your workspace…" />

  return (
    <HomeContent
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
    />
  )
}

function HomeContent({
  organizationId,
  userId,
  client,
}: NonNullable<ReturnType<typeof useSessionContext>>) {
  const session = { organizationId, userId, client }
  const myWork = useMyWork(session)
  const recent = useIssues(session, { limit: 10 })

  if (myWork.isPending || recent.isPending)
    return <LoadingState label="Loading your work…" />
  if (myWork.isError || recent.isError)
    return (
      <ErrorState
        message="Could not load your work."
        onRetry={() => {
          void myWork.refetch()
          void recent.refetch()
        }}
      />
    )

  const assigned = myWork.data?.assignedIssues ?? []
  const recentIssues = flattenPages(recent.data)

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>My Work</Text>
      {assigned.length === 0 ? (
        <EmptyState message="Nothing assigned to you right now." />
      ) : (
        <FlatList
          data={assigned}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Link href={`/(app)/issues/${item.identifier}`}>
              <Text>{item.title}</Text>
            </Link>
          )}
        />
      )}
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Recent issues</Text>
      {recentIssues.length === 0 ? (
        <EmptyState message="No recent issues." />
      ) : (
        <FlatList
          data={recentIssues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Link href={`/(app)/issues/${item.identifier}`}>
              <Text>{item.title}</Text>
            </Link>
          )}
        />
      )}
    </View>
  )
}
