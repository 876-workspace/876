import type { Mock } from 'vitest'

/**
 * Every method of `T` as a Vitest mock, while still being assignable to `T`.
 *
 * A `Record<string, Mock>` intersection does **not** work here: TypeScript
 * resolves a named property from the declared member and ignores the index
 * signature, so `repo.findUser.mockResolvedValue(...)` fails to compile even
 * though it works at runtime. Mapping over `keyof T` intersects per property,
 * which is what makes both the mock helpers and the real signature visible.
 */
export type Mocked<T> = { [K in keyof T]: Mock } & T
