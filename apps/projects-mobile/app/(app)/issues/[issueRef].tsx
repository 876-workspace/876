import { Link, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Button, FlatList, Text, TextInput, View } from 'react-native'

import {
  flattenPages,
  useComments,
  useCreateComment,
  useDeleteComment,
  useIssue,
} from '../../../src/api/hooks'
import { useSessionContext } from '../../../src/api/session-context'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../src/components/states'

export default function IssueDetailScreen() {
  const { issueRef } = useLocalSearchParams<{ issueRef: string }>()
  const session = useSessionContext()
  if (!session) return <LoadingState label="Preparing your workspace…" />
  return (
    <IssueContent
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
      issueRef={issueRef ?? ''}
    />
  )
}

function IssueContent({
  organizationId,
  userId,
  client,
  issueRef,
}: NonNullable<ReturnType<typeof useSessionContext>> & { issueRef: string }) {
  const session = { organizationId, userId, client }
  const issue = useIssue(session, issueRef)
  const comments = useComments(session, issueRef)
  const createComment = useCreateComment(session, issueRef)
  const deleteComment = useDeleteComment(session, issueRef)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (issue.isPending) return <LoadingState />
  if (issue.isError || !issue.data)
    return (
      <ErrorState
        message="Could not load this issue."
        onRetry={() => void issue.refetch()}
      />
    )

  async function handlePost() {
    setError(null)
    if (!draft.trim()) return
    try {
      await createComment.mutateAsync({ body: draft.trim() })
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment.')
    }
  }

  const rows = flattenPages(comments.data)

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>
        {issue.data.identifier} · {issue.data.title}
      </Text>
      <Text>
        {issue.data.status} · {issue.data.priority}
      </Text>
      {issue.data.description ? <Text>{issue.data.description}</Text> : null}
      <Link href={`/(app)/issues/${issueRef}/edit`}>
        <Text>Edit issue</Text>
      </Link>
      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>
        Comments
      </Text>
      {comments.isPending ? <LoadingState /> : null}
      {comments.isError ? (
        <ErrorState
          message="Could not load comments."
          onRetry={() => void comments.refetch()}
        />
      ) : null}
      {rows.length === 0 && comments.data ? (
        <EmptyState message="No comments yet." />
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        onEndReached={() => {
          if (comments.hasNextPage) void comments.fetchNextPage()
        }}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10 }}>
            <Text>{item.body}</Text>
            <Text
              onPress={() => void deleteComment.mutateAsync(item.id)}
              style={{ marginTop: 4 }}
            >
              Delete
            </Text>
          </View>
        )}
      />
      {error ? <Text>{error}</Text> : null}
      <TextInput
        placeholder="Write a comment"
        value={draft}
        onChangeText={setDraft}
        multiline
        style={{ borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 80 }}
      />
      <Button
        title={createComment.isPending ? 'Posting…' : 'Post comment'}
        onPress={() => void handlePost()}
        disabled={createComment.isPending}
      />
    </View>
  )
}
