export const metadata = { title: 'Feature Flags' }

/**
 * The list-only state. The toolbar and the feature flags list live in the
 * layout, so this route renders nothing of its own — it simply leaves the
 * card slot empty, which is what collapses the second grid column.
 */
export default function AppFeaturesPage() {
  return null
}
