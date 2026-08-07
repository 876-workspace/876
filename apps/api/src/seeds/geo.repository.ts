import { prisma } from '@/db/client'

export type CountrySeedInput = {
  code: string
  name: string
  phonePrefix: string | null
  defaultCurrencyCode: string | null
  isEnabled: boolean
}

export type RegionSeedInput = {
  id: string
  countryCode: string
  code: string
  name: string
  type: string
  isEnabled: boolean
}

export async function upsertCountry(input: CountrySeedInput): Promise<void> {
  await prisma.country.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      name: input.name,
      phonePrefix: input.phonePrefix,
      defaultCurrencyCode: input.defaultCurrencyCode,
      isEnabled: input.isEnabled,
    },
    update: {
      name: input.name,
      phonePrefix: input.phonePrefix,
      defaultCurrencyCode: input.defaultCurrencyCode,
      isEnabled: input.isEnabled,
    },
  })
}

export async function upsertRegion(input: RegionSeedInput): Promise<void> {
  await prisma.region.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      countryCode: input.countryCode,
      code: input.code,
      name: input.name,
      type: input.type,
      isEnabled: input.isEnabled,
    },
    update: {
      countryCode: input.countryCode,
      code: input.code,
      name: input.name,
      type: input.type,
      isEnabled: input.isEnabled,
    },
  })
}

export async function listCountryCodes(): Promise<string[]> {
  const rows = await prisma.country.findMany({ select: { code: true } })
  return rows.map((row) => row.code)
}
