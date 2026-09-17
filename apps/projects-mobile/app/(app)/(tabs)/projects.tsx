import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, Text, TextInput, View } from 'react-native'

import { flattenPages, useProjects } from '../../../src/api/hooks'
import { useSessionContext } from '../../../src/api/session-context'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../src/components/states'

export default function ProjectsScreen() {
  const session = useSessionContext()
  const [search, setSearch] = useState('')
  if (!session) return <LoadingState label="Preparing your workspace…" />
  return (
    <ProjectsContent
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
      search={search}
      onSearch={setSearch}
    />
  )
}

function ProjectsContent({
  organizationId,
  userId,
  client,
  search,
  onSearch,
}: NonNullable<ReturnType<typeof useSessionContext>> & {
  search: string
  onSearch: (value: string) => void
}) {
  const projects = useProjects(
    { organizationId, userId, client },
    search ? { q: search } : {}
  )

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Search projects"
        value={search}
        onChangeText={onSearch}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />
      {projects.isPending ? <LoadingState /> : null}
      {projects.isError ? (
        <ErrorState
          message="Could not load projects."
          onRetry={() => void projects.refetch()}
        />
      ) : null}
      {projects.data
        ? (() => {
            const rows = flattenPages(projects.data)
            if (rows.length === 0)
              return <EmptyState message="No projects found." />
            return (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                onEndReached={() => {
                  if (projects.hasNextPage) void projects.fetchNextPage()
                }}
                renderItem={({ item }) => (
                  <Link href={`/(app)/projects/${item.id}`}>
                    <View style={{ paddingVertical: 12 }}>
                      <Text style={{ fontSize: 17, fontWeight: '600' }}>
                        {item.name}
                      </Text>
                      <Text>{item.key}</Text>
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
