import type { AppContext } from './types.ts'

export function createAppContext(input: AppContext): Readonly<AppContext> {
  return Object.freeze({ ...input })
}
