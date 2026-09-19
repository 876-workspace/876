import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, Text, TextInput, View } from 'react-native'

import { useIssue, useUpdateIssue } from '../../../../src/api/hooks'
import { useSessionContext } from '../../../../src/api/session-context'
import { ErrorState, LoadingState } from '../../../../src/components/states'

export default function EditIssueScreen() {
  const router = useRouter()
  const { issueRef } = useLocalSearchParams<{ issueRef: string }>()
  const session = useSessionContext()
  if (!session) return <LoadingState label="Preparing your workspace…" />
  return (
    <EditForm
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
      issueRef={issueRef ?? ''}
      onDone={() => router.back()}
    />
  )
}

function EditForm({
  organizationId,
  userId,
  client,
  issueRef,
  onDone,
}: NonNullable<ReturnType<typeof useSessionContext>> & {
  issueRef: string
  onDone: () => void
}) {
  const session = { organizationId, userId, client }
  const issue = useIssue(session, issueRef)
  const updateIssue = useUpdateIssue(session, issueRef)
  const [title, setTitle] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (issue.isPending) return <LoadingState />
  if (issue.isError || !issue.data)
    return (
      <ErrorState
        message="Could not load this issue."
        onRetry={() => void issue.refetch()}
      />
    )

  async function handleSave() {
    setError(null)
    try {
      await updateIssue.mutateAsync({
        ...(title !== null ? { title } : {}),
        ...(description !== null ? { description } : {}),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.')
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>
        Edit {issue.data.identifier}
      </Text>
      {error ? <Text>{error}</Text> : null}
      <TextInput
        placeholder="Title"
        defaultValue={issue.data.title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />
      <TextInput
        placeholder="Description"
        defaultValue={issue.data.description ?? ''}
        onChangeText={setDescription}
        multiline
        style={{ borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 120 }}
      />
      <Button
        title={updateIssue.isPending ? 'Saving…' : 'Save changes'}
        onPress={() => void handleSave()}
        disabled={updateIssue.isPending}
      />
    </View>
  )
}
