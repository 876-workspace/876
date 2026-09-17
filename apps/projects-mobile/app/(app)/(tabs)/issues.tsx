import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, Text, TextInput, View } from 'react-native'

import { flattenPages, useIssues } from '../../../src/api/hooks'
import { useSessionContext } from '../../../src/api/session-context'
import { useSession } from '../../../src/auth/session'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../src/components/states'

type Lens = 'all' | 'mine' | 'open'

export default function IssuesScreen() {
  const session = useSessionContext()
  const { userId } = useSession()
  const [lens, setLens] = useState<Lens>('all')
  const [search, setSearch] = useState('')
  if (!session) return <LoadingState label="Preparing your workspace…" />
  return (
    <IssuesContent
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
      lens={lens}
      onLens={setLens}
      search={search}
      onSearch={setSearch}
      viewerUserId={userId}
    />
  )
}

function IssuesContent({
  organizationId,
  userId,
  client,
  lens,
  onLens,
  search,
  onSearch,
  viewerUserId,
}: NonNullable<ReturnType<typeof useSessionContext>> & {
  lens: Lens
  onLens: (lens: Lens) => void
  search: string
  onSearch: (value: string) => void
  viewerUserId: string | null
}) {
  const issues = useIssues(
    { organizationId, userId, client },
    {
      ...(lens === 'mine' && viewerUserId ? { assignee: viewerUserId } : {}),
      ...(lens === 'open' ? { status: 'open' } : {}),
      ...(search ? { q: search } : {}),
    }
  )

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
        {(['all', 'mine', 'open'] as Lens[]).map((option) => (
          <Text
            key={option}
            onPress={() => onLens(option)}
            style={{ fontWeight: lens === option ? '700' : '400' }}
          >
            {option === 'all' ? 'All' : option === 'mine' ? 'Mine' : 'Open'}
          </Text>
        ))}
      </View>
      <TextInput
        placeholder="Search issues"
        value={search}
        onChangeText={onSearch}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />
      <Link href="/(app)/issues/new" style={{ marginBottom: 12 }}>
        <Text>New issue</Text>
      </Link>
      {issues.isPending ? <LoadingState /> : null}
      {issues.isError ? (
        <ErrorState
          message="Could not load issues."
          onRetry={() => void issues.refetch()}
        />
      ) : null}
      {issues.data
        ? (() => {
            const rows = flattenPages(issues.data)
            if (rows.length === 0)
              return <EmptyState message="No issues found." />
            return (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                onEndReached={() => {
                  if (issues.hasNextPage) void issues.fetchNextPage()
                }}
                renderItem={({ item }) => (
                  <Link href={`/(app)/issues/${item.identifier}`}>
                    <View style={{ paddingVertical: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600' }}>
                        {item.identifier} · {item.title}
                      </Text>
                      <Text>
                        {item.status} · {item.priority}
                      </Text>
                    </View>
                  </Link>
                )}
              />
            )
          })()
        : null}
    </View>
  )
}
