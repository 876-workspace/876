import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, Text, TextInput, View } from 'react-native'

import { useCreateIssue } from '../../../src/api/hooks'
import { useSessionContext } from '../../../src/api/session-context'
import { LoadingState } from '../../../src/components/states'

export default function NewIssueScreen() {
  const router = useRouter()
  const session = useSessionContext()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!session) return <LoadingState label="Preparing your workspace…" />
  return (
    <NewIssueForm
      organizationId={session.organizationId}
      userId={session.userId}
      client={session.client}
      title={title}
      onTitle={setTitle}
      description={description}
      onDescription={setDescription}
      projectId={projectId}
      onProjectId={setProjectId}
      error={error}
      onError={setError}
      onDone={() => router.back()}
    />
  )
}

function NewIssueForm({
  organizationId,
  userId,
  client,
  title,
  onTitle,
  description,
  onDescription,
  projectId,
  onProjectId,
  error,
  onError,
  onDone,
}: NonNullable<ReturnType<typeof useSessionContext>> & {
  title: string
  onTitle: (value: string) => void
  description: string
  onDescription: (value: string) => void
  projectId: string
  onProjectId: (value: string) => void
  error: string | null
  onError: (message: string | null) => void
  onDone: () => void
}) {
  const createIssue = useCreateIssue({ organizationId, userId, client })

  async function handleCreate() {
    onError(null)
    if (!title.trim() || !projectId.trim()) {
      onError('A title and project are required.')
      return
    }
    try {
      await createIssue.mutateAsync({
        projectId: projectId.trim(),
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      })
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create issue.')
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>New issue</Text>
      {error ? <Text>{error}</Text> : null}
      <TextInput
        placeholder="Project ID"
        value={projectId}
        onChangeText={onProjectId}
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />
      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={onTitle}
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={onDescription}
        multiline
        style={{ borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 120 }}
      />
      <Button
        title={createIssue.isPending ? 'Creating…' : 'Create issue'}
        onPress={() => void handleCreate()}
        disabled={createIssue.isPending}
      />
    </View>
  )
}
