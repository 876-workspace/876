import {
  billingTableSample,
  decideLedgerRepair,
  foreignMigrationRows,
} from '../migration-ledger'

describe('Billing Prisma migration-ledger adoption', () => {
  const local = ['20260709000000_init', '20260722000200_adopt_vendor_table']

  it('repairs only the known foreign rows and adopted vendor migration', () => {
    const decision = decideLedgerRepair({
      localMigrations: local,
      databaseMigrations: [
        {
          migrationName: '20260709000000_init',
          finished: true,
          rolledBack: false,
        },
        ...foreignMigrationRows.map((migrationName) => ({
          migrationName,
          finished: true,
          rolledBack: false,
        })),
      ],
      presentSampleTables: billingTableSample,
      publicTableCount: 79,
    })

    expect(decision).toEqual({
      action: 'repair',
      remove: [...foreignMigrationRows].sort(),
      resolve: ['20260722000200_adopt_vendor_table'],
    })
  })

  it('skips an adopted ledger when ordinary DDL migrations are pending', () => {
    const decision = decideLedgerRepair({
      localMigrations: [
        ...local,
        '20260817120000_billing_tenant_tombstone',
        '20260817121000_billing_system_roles_backfill',
      ],
      databaseMigrations: local.map((migrationName) => ({
        migrationName,
        finished: true,
        rolledBack: false,
      })),
      presentSampleTables: billingTableSample,
      publicTableCount: 79,
    })

    expect(decision).toEqual({ action: 'skip' })
  })

  it('skips a fresh database so migrate deploy can initialize it', () => {
    const decision = decideLedgerRepair({
      localMigrations: local,
      databaseMigrations: [],
      presentSampleTables: [],
      publicTableCount: 0,
    })

    expect(decision).toEqual({ action: 'skip' })
  })

  it('still refuses an incomplete legacy database or an unknown migration row', () => {
    expect(
      decideLedgerRepair({
        localMigrations: local,
        databaseMigrations: [
          {
            migrationName: foreignMigrationRows[0],
            finished: true,
            rolledBack: false,
          },
        ],
        presentSampleTables: [],
        publicTableCount: 80,
      }).action
    ).toBe('refuse')
    expect(
      decideLedgerRepair({
        localMigrations: local,
        databaseMigrations: [
          {
            migrationName: 'unexpected',
            finished: true,
            rolledBack: false,
          },
        ],
        presentSampleTables: billingTableSample,
        publicTableCount: 79,
      }).action
    ).toBe('refuse')
  })

  it('refuses pending DDL while legacy ledger repair is still required', () => {
    const decision = decideLedgerRepair({
      localMigrations: [...local, '20260817120000_billing_tenant_tombstone'],
      databaseMigrations: [
        {
          migrationName: '20260709000000_init',
          finished: true,
          rolledBack: false,
        },
        ...foreignMigrationRows.map((migrationName) => ({
          migrationName,
          finished: true,
          rolledBack: false,
        })),
      ],
      presentSampleTables: billingTableSample,
      publicTableCount: 79,
    })

    expect(decision).toEqual({
      action: 'refuse',
      reason:
        'unapplied Billing migrations require DDL: 20260817120000_billing_tenant_tombstone',
    })
  })
})
