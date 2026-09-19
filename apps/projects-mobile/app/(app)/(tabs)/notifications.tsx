import { FlatList, Text, View } from 'react-native'

import { useNotifications } from '../../../src/api/hooks'
import { useSessionContext } from '../../../src/api/session-context'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../src/components/states'

export default function NotificationsScreen() {
  const session = useSessionContext()
  if (!session) return <LoadingState label="Preparing your workspace…" />
  return (
    <NotificationsContent
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
    />
  )
}

function NotificationsContent(
  props: NonNullable<ReturnType<typeof useSessionContext>>
) {
  const notifications = useNotifications(props)

  if (notifications.isPending) return <LoadingState />
  if (notifications.isError)
    return (
      <ErrorState
        message="Could not load notifications."
        onRetry={() => void notifications.refetch()}
      />
    )

  const rows = notifications.data?.data ?? []
  if (rows.length === 0) return <EmptyState message="You are all caught up." />

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          <Text
            style={{ fontSize: 16, fontWeight: item.readAt ? '400' : '600' }}
          >
            {item.title}
          </Text>
          <Text>{item.kind}</Text>
        </View>
      )}
    />
  )
}
