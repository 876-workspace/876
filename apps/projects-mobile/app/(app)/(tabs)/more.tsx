import { useState } from 'react'
import { Button, FlatList, Text, View } from 'react-native'

import { useSessionContext } from '../../../src/api/session-context'
import { useSession } from '../../../src/auth/session'
import { LoadingState } from '../../../src/components/states'

export default function MoreScreen() {
  const session = useSessionContext()
  const { memberships, organizationId, signOut, switchOrganization } =
    useSession()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!session) return <LoadingState label="Preparing your workspace…" />

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Organization</Text>
      {error ? <Text>{error}</Text> : null}
      <FlatList
        data={memberships}
        keyExtractor={(item) => item.organization.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight:
                  item.organization.id === organizationId ? '700' : '400',
              }}
              onPress={() =>
                item.organization.id === organizationId
                  ? undefined
                  : void run(() => switchOrganization(item.organization.id))
              }
            >
              {item.organization.name ?? item.organization.slug}
            </Text>
          </View>
        )}
      />
      <Button
        title={busy ? 'Working…' : 'Sign out'}
        onPress={() => void run(() => signOut())}
        disabled={busy}
      />
    </View>
  )
}
