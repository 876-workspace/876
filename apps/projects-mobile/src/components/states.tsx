import { ActivityIndicator, Text, View } from 'react-native'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12 }}>{label}</Text>
    </View>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text style={{ textAlign: 'center' }}>{message}</Text>
      {onRetry ? (
        <Text
          onPress={onRetry}
          style={{ marginTop: 12, textDecorationLine: 'underline' }}
        >
          Try again
        </Text>
      ) : null}
    </View>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text style={{ textAlign: 'center' }}>{message}</Text>
    </View>
  )
}
