export function requireCapability<T>(value: T | undefined, name: string): T {
  if (!value) {
    throw new Error(`876 server client capability "${name}" is not configured.`)
  }
  return value
}
