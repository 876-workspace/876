import { Link, useLocalSearchParams } from 'expo-router'
import { FlatList, Text, View } from 'react-native'

import { flattenPages, useIssues, useProject } from '../../../src/api/hooks'
import { useSessionContext } from '../../../src/api/session-context'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../src/components/states'

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const session = useSessionContext()
  if (!session) return <LoadingState label="Preparing your workspace…" />
  return (
    <ProjectContent
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
      projectId={projectId ?? ''}
    />
  )
}

function ProjectContent({
  organizationId,
  userId,
  client,
  projectId,
}: NonNullable<ReturnType<typeof useSessionContext>> & { projectId: string }) {
  const session = { organizationId, userId, client }
  const project = useProject(session, projectId)
  const issues = useIssues(session, { project: projectId })

  if (project.isPending) return <LoadingState />
  if (project.isError || !project.data)
    return (
      <ErrorState
        message="Could not load this project."
        onRetry={() => void project.refetch()}
      />
    )

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>
        {project.data.name}
      </Text>
      <Text>
        {project.data.key} · {project.data.status}
      </Text>
      {project.data.description ? (
        <Text>{project.data.description}</Text>
      ) : null}
      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>
        Issues
      </Text>
      {issues.isPending ? <LoadingState /> : null}
      {issues.isError ? (
        <ErrorState
          message="Could not load project issues."
          onRetry={() => void issues.refetch()}
        />
      ) : null}
      {issues.data
        ? (() => {
            const rows = flattenPages(issues.data)
            if (rows.length === 0)
              return <EmptyState message="No issues in this project." />
            return (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                onEndReached={() => {
                  if (issues.hasNextPage) void issues.fetchNextPage()
                }}
                renderItem={({ item }) => (
                  <Link href={`/(app)/issues/${item.identifier}`}>
                    <View style={{ paddingVertical: 10 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600' }}>
                        {item.identifier} · {item.title}
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
