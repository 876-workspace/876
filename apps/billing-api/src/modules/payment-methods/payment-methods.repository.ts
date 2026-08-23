import { prisma } from '@/db/client'
export const paymentMethodsDb = prisma
export const paymentMethodsRepository = {
  find: (tenantId: string, id: string) =>
    prisma.paymentMethod.findFirst({ where: { tenantId, id } }),
  list: (tenantId: string, where: Record<string, unknown>, take: number) =>
    prisma.paymentMethod.findMany({
      where: { tenantId, ...where },
      orderBy: { createdAt: 'desc' },
      take,
    }),
}
