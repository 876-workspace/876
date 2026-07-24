import 'server-only'

import { PrismaNeon } from '@prisma/adapter-neon'

import { generateId, ID_PREFIXES, type EntityType } from '@/lib/id'

import { PrismaClient } from './generated/prisma/client'
import { assertLegacyBillingWriteAllowed } from './write-guard'

export type {
  AppFinanceConnection,
  AppFinanceConnectionStatus,
  BankAccount,
  BankAccountType,
  BankTransaction,
  BankTransactionStatus,
  BankTransactionType,
  CreditNote,
  CreditNoteAllocation,
  CreditNoteLine,
  CreditNoteStatus,
  Currency,
  Customer,
  CustomerKind,
  CustomerStatus,
  CustomerType,
  FinanceProvisioningInbox,
  IntervalUnit,
  Invoice,
  InvoiceStatus,
  LedgerDirection,
  LedgerEntryType,
  Item,
  ItemType,
  Member,
  MemberStatus,
  Payment,
  PaymentAllocation,
  PaymentMode,
  PaymentTermRule,
  Refund,
  Plan,
  Price,
  PriceType,
  Product,
  Quote,
  QuoteStatus,
  Role,
  Subscription,
  SubscriptionStatus,
  Tenant,
  TenantStatus,
  TaxAuthority,
  TaxRate,
} from './generated/prisma/client'

function createPrisma() {
  const rawConnectionString = process.env.BILLING_DATABASE_URL
  if (!rawConnectionString) {
    throw new Error(
      'BILLING_DATABASE_URL is not set; 876 Billing DB unavailable.'
    )
  }

  const connectionString = rawConnectionString.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)\b/,
    '$1verify-full'
  )
  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          assertLegacyBillingWriteAllowed(operation)
          if (operation === 'create') {
            const data = (args as { data: Record<string, unknown> }).data
            if (model in ID_PREFIXES && !data.id) {
              data.id = generateId(model as EntityType)
            }
          }
          return query(args)
        },
      },
    },
  })
}

type Prisma = ReturnType<typeof createPrisma>

/** Extension-aware client surface exposed inside interactive transactions. */
export type PrismaTransaction = Omit<
  Prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>

const globalForPrisma = globalThis as unknown as {
  prisma?: Prisma
  prismaClientConstructor?: typeof PrismaClient
}

let client: Prisma | undefined

function resolvePrisma(): Prisma {
  if (client) return client

  client =
    globalForPrisma.prisma &&
    globalForPrisma.prismaClientConstructor === PrismaClient
      ? globalForPrisma.prisma
      : createPrisma()

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
    globalForPrisma.prismaClientConstructor = PrismaClient
  }

  return client
}

/**
 * Only `@/lib/service` may query Billing's local database directly.
 *
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `BILLING_DATABASE_URL`, only the Worker runtime does.
 */
export const prisma = new Proxy({} as Prisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof Prisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
