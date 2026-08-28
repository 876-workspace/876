import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

describe('Billing migration SQL', () => {
  it('does not retain a patch marker in the payment instrument migration', async () => {
    const migration = await readFile(
      new URL(
        '../../../prisma/migrations/20260823000000_billing_payment_instrument_plane/migration.sql',
        import.meta.url
      ),
      'utf8'
    )

    expect(migration).toMatch(/^-- CreateEnum/)
  })
})
