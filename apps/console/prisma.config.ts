import { config } from 'dotenv'

import { defineConfig, env } from 'prisma/config'

// Prisma CLI (generate/migrate/seed) runs outside Next.js, so load the same env
// files Next would. `.env.development.local` holds the dev `CONSOLE_DATABASE_URL`; in
// prod/CI the variable is already set and dotenv leaves it untouched.
config({ path: ['.env.development.local', '.env'] })

/**
 * Prisma 7 config for Console's own database (in-app, server-only).
 *
 * `schema` points at the multi-file schema FOLDER (`prisma/schema/`), which
 * holds `schema.prisma` (generator + datasource provider) plus one `*.prisma`
 * file per model. In Prisma 7 the connection URL lives here (not in the schema)
 * and is used by Migrate; the runtime client connects via the `@prisma/adapter-pg`
 * driver adapter (see `src/lib/db/index.ts`). `CONSOLE_DATABASE_URL` is loaded
 * from the env above.
 */
export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('CONSOLE_DATABASE_URL'),
  },
})
