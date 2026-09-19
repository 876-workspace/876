import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, FlatList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useSession } from '../src/auth/session'

export default function SignInScreen() {
  const router = useRouter()
  const { status, organizationId, memberships, signIn, switchOrganization } =
    useSession()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'signed-in' && organizationId) {
    router.replace('/(app)/(tabs)')
    return null
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>876 Projects</Text>
        {status === 'signed-in' ? (
          <>
            <Text>Choose an organization to continue.</Text>
            {error ? <Text>{error}</Text> : null}
            <FlatList
              data={memberships}
              keyExtractor={(item) => item.organization.id}
              renderItem={({ item }) => (
                <View style={{ paddingVertical: 12 }}>
                  <Text
                    style={{ fontSize: 17 }}
                    onPress={() =>
                      void run(() => switchOrganization(item.organization.id))
                    }
                  >
                    {item.organization.name ?? item.organization.slug}
                  </Text>
                </View>
              )}
            />
          </>
        ) : (
          <>
            <Text>Sign in with your 876 account to continue.</Text>
            {error ? <Text>{error}</Text> : null}
            <Button
              title={busy ? 'Opening browser…' : 'Sign in with 876'}
              onPress={() => void run(() => signIn())}
              disabled={busy || status === 'loading'}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  )
}
