import 'server-only'

/**
 * Invoice has no app-owned feature rollouts yet. Keeping this request-shaped
 * boundary lets AccessContext add them without turning a flag into authority.
 */
export async function getFeatures(): Promise<{ featureKeys: string[] }> {
  return { featureKeys: [] }
}
