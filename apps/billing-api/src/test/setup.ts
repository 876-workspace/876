import { resetSettingsForTest } from '@/config'

// Keep unit tests independent of any developer or CI Accelerate URL. Prisma's
// Accelerate extension performs connection discovery when the client is built,
// even when a repository is mocked and no query is executed.
process.env.BILLING_DATABASE_URL =
  'postgresql://billing_test:billing_test@127.0.0.1:5432/billing_test'

beforeEach(() => {
  resetSettingsForTest(process.env)
})
