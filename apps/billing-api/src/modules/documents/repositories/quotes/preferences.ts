import { nowUnixSeconds } from '@876/core/timestamps'

import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'

import type {
  QuoteAcceptedConversion,
  QuotePreferenceResource,
} from '../../schemas/quote-preference'

const MODULE = 'quotes'
const ACCEPTED_QUOTE_CONVERSION = 'accepted-quote-conversion'
const DEFAULT_ACCEPTED_QUOTE_CONVERSION: QuoteAcceptedConversion = 'manual'

function decodeAcceptedQuoteConversion(
  row: { valueType: string; stringValue: string | null } | null
): QuoteAcceptedConversion {
  return row?.valueType === 'enum' &&
    row.stringValue === 'draft-invoice-on-accept'
    ? 'draft-invoice-on-accept'
    : DEFAULT_ACCEPTED_QUOTE_CONVERSION
}

export async function retrieveWithClient(
  client: Pick<Prisma.TransactionClient, 'modulePreference'>,
  tenantId: string
): Promise<QuotePreferenceResource> {
  const row = await client.modulePreference.findFirst({
    where: { tenantId, module: MODULE, key: ACCEPTED_QUOTE_CONVERSION },
    select: { valueType: true, stringValue: true },
  })

  return {
    object: 'quote-preference',
    acceptedQuoteConversion: decodeAcceptedQuoteConversion(row),
  }
}

/** Missing override rows resolve to the finance module catalog default. */
export function retrieve(tenantId: string) {
  return retrieveWithClient(prisma, tenantId)
}

/** Stores only the non-default override. `manual` removes the row. */
export async function update(
  tenantId: string,
  acceptedQuoteConversion: QuoteAcceptedConversion,
  updatedBy?: string
): Promise<QuotePreferenceResource> {
  if (acceptedQuoteConversion === DEFAULT_ACCEPTED_QUOTE_CONVERSION) {
    await prisma.modulePreference.deleteMany({
      where: { tenantId, module: MODULE, key: ACCEPTED_QUOTE_CONVERSION },
    })
    return {
      object: 'quote-preference',
      acceptedQuoteConversion: DEFAULT_ACCEPTED_QUOTE_CONVERSION,
    }
  }

  const now = nowUnixSeconds()
  await prisma.modulePreference.upsert({
    where: {
      billing_module_preferences_tenant_module_key: {
        tenantId,
        module: MODULE,
        key: ACCEPTED_QUOTE_CONVERSION,
      },
    },
    create: {
      id: generateId('ModulePreference'),
      tenantId,
      module: MODULE,
      key: ACCEPTED_QUOTE_CONVERSION,
      valueType: 'enum',
      stringValue: acceptedQuoteConversion,
      updatedBy: updatedBy ?? null,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      valueType: 'enum',
      stringValue: acceptedQuoteConversion,
      integerValue: null,
      decimalValue: null,
      booleanValue: null,
      referenceNamespace: null,
      referenceKey: null,
      updatedBy: updatedBy ?? null,
      updatedAt: now,
    },
  })

  return { object: 'quote-preference', acceptedQuoteConversion }
}

export const quotePreferences = { retrieve, retrieveWithClient, update }
