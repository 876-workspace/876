# @876/core

Shared foundation package for 876 apps and SDK-adjacent code.

## Use For

| Need                    | Import                     |
| ----------------------- | -------------------------- |
| Errors and error lookup | `@876/core/errors`         |
| ID generation           | `@876/core/id`             |
| Unix timestamp helpers  | `@876/core/timestamps`     |
| Data resource fetchers  | `@876/core/fetch/data`     |
| Auth return-to helpers  | `@876/core/auth/return-to` |
| Domain types            | `@876/core/types/*`        |

## Example

```ts
import { organizations } from '@876/core/fetch/data'
import { unixTimestamp } from '@876/core/timestamps'

const result = await organizations.list(
  { limit: 10 },
  { baseUrl: process.env.API_URL, token: accessToken }
)

if (result.error) return result

console.log(unixTimestamp(), result.data.data)
```

## Commands

```bash
pnpm --filter @876/core typecheck
```

See `../../apps/docs/content/docs/index.mdx` and the root `package.json` scripts for current package ownership and commands.
