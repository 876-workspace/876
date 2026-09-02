/**
 * Test double for `next/navigation`, aliased in `vitest.config.ts`.
 *
 * Route-aware components read the open record from the layout segments, so a
 * test drives them by writing to `navigationTestState` rather than by
 * re-mocking this module in every file.
 */
export const navigationTestState = {
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}

export function resetNavigationTestState() {
  navigationTestState.segments = []
  navigationTestState.searchParams = new URLSearchParams()
}

export function redirect() {
  throw new Error('redirect')
}
export function notFound() {
  throw new Error('notFound')
}
export const useRouter = () => ({ push: () => {}, replace: () => {} })
export const useSearchParams = () => navigationTestState.searchParams
export const usePathname = () => '/'
export const useSelectedLayoutSegments = () => navigationTestState.segments
