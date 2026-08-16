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

  it('refuses a foreign database or an unknown migration row', () => {
    expect(
      decideLedgerRepair({
        localMigrations: local,
        databaseMigrations: [],
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
})
