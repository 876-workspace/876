import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'

import { generateId, ID_PREFIXES, type EntityType } from '@/lib/id'

import { PrismaClient } from './generated/prisma/client'

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
  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async create({
          model,
          args,
          query,
        }: {
          model: string
          args: Record<string, unknown>
          query: (args: unknown) => Promise<unknown>
        }) {
          const data = args.data as Record<string, unknown>
          if (model in ID_PREFIXES && !data.id) {
            data.id = generateId(model as EntityType)
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

/** Only `@/lib/service` may query Billing's local database directly. */
export const prisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaClientConstructor === PrismaClient
    ? globalForPrisma.prisma
    : createPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaClientConstructor = PrismaClient
}
