import { prisma } from '@/db/client'
import type { Prisma } from '@/db/generated/prisma/client'
import type { IntervalUnit, PriceType } from '@/db/generated/prisma/enums'

export { prisma }
export type PrismaTransaction = Prisma.TransactionClient
export type { IntervalUnit, PriceType }
