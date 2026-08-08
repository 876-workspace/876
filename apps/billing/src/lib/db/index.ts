import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import {
  createQueryGuard,
  createRequestScopedResolver,
  type QueryFailure,
} from '@876/core/db'
import * as Sentry from '@sentry/nextjs'

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

/**
 * Reports a database failure with the consequence spelled out, so a hung or
 * refused query is attributable in Sentry instead of arriving as a bare
 * Cloudflare 1101 with no application error attached.
 */
function reportDbFailure(
  error: unknown,
  failure: Partial<QueryFailure> & { stage: 'pool' | 'query' }
): void {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      category: 'db',
      db_stage: failure.stage,
      db_failure: failure.crossRequestIo
        ? 'cross_request_io'
        : failure.timedOut
          ? 'timeout'
          : 'error',
    },
    extra: {
      model: failure.model ?? null,
      operation: failure.operation ?? null,
      consequence: failure.crossRequestIo
        ? 'A pg pool outlived the request that opened it. The query never settles, so Cloudflare cancels the invocation and the page fails with Error 1101.'
        : 'The request fails instead of rendering.',
    },
  })
}

function createPrisma() {
  const rawConnectionString = process.env.BILLING_DATABASE_URL
  if (!rawConnectionString) {
    throw new Error(
      'BILLING_DATABASE_URL is not set; 876 Billing DB unavailable.'
    )
  }

  const connectionString = rawConnectionString
  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({ adapter })
    .$extends({
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
    .$extends({
      query: {
        $allOperations: createQueryGuard({
          onFailure: (error, failure) =>
            reportDbFailure(error, { ...failure, stage: 'query' }),
        }),
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

const resolvePrisma = createRequestScopedResolver<Prisma>({
  create: createPrisma,
  adoptProcessClient: () =>
    globalForPrisma.prismaClientConstructor === PrismaClient
      ? globalForPrisma.prisma
      : undefined,
  storeProcessClient: (client) => {
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client
      globalForPrisma.prismaClientConstructor = PrismaClient
    }
  },
  onMissingScope: () =>
    Sentry.captureMessage(
      'Billing DB: no Cloudflare request scope on workerd',
      {
        level: 'error',
        tags: { category: 'db', db_failure: 'missing_request_scope' },
        extra: {
          consequence:
            "OpenNext's request-context symbol did not resolve, so per-request client scoping is off. Queries fall back to a throwaway client per access.",
        },
      }
    ),
})

/**
 * Only `@/lib/service` may query Billing's local database directly.
 *
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `BILLING_DATABASE_URL`, only the Worker runtime does.
 *
 * On Cloudflare Workers the client is also scoped to the in-flight request:
 * the pg pool's socket belongs to the request that opened it, and reusing it
 * from the next request on the same isolate hangs the Worker. See
 * `@876/core/db`.
 */
export const prisma = new Proxy({} as Prisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof Prisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
