import { nowUnixSeconds } from '@876/core/timestamps'
import { Prisma } from '@/db'
import { appError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import {
  credentialContext,
  getSecureFieldProvider,
  type SealedCredentialType,
} from '@/platform/secure-field'
import { getVaultClient } from '@/providers/workos/vault'
import type {
  PaymentMethodCreateParams,
  PaymentMethodListQuery,
  PaymentMethodUpdateParams,
} from './schemas'
import { serializePaymentMethod } from './payment-methods.serializers'
import {
  paymentMethodsDb as prisma,
  paymentMethodsRepository,
} from './payment-methods.repository'
const notFound = () =>
  appError('payment-method/not-found', {
    message: 'Payment method not found.',
    httpStatus: 404,
  })
function validateCredential(body: PaymentMethodCreateParams) {
  const credential = body.credential
  if (body.type === 'MANUAL') {
    if (credential)
      throw appError('payment-method/invalid-credential', {
        message: 'Manual payment methods cannot have a credential.',
        httpStatus: 422,
      })
    return
  }
  if (!credential || credential.storage === 'none')
    throw appError('payment-method/invalid-credential', {
      message: 'This payment method requires a credential.',
      httpStatus: 422,
    })

  // Only a card or a bank account has a secret number to seal. A wallet is
  // reached through the processor that owns it, so sealing "the wallet" would
  // store something that cannot be used to charge anything.
  if (
    credential.storage === 'vault' &&
    body.type !== 'CARD' &&
    body.type !== 'BANK_ACCOUNT'
  )
    throw appError('payment-method/invalid-credential', {
      message: 'Only a card or bank account credential can be vaulted.',
      httpStatus: 422,
    })
}
export const paymentMethodsService = {
  async list(tenantId: string, query: PaymentMethodListQuery, url: string) {
    const rows = await paymentMethodsRepository.list(
      tenantId,
      {
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      query.limit ?? 25
    )
    return {
      object: 'list' as const,
      data: rows.map(serializePaymentMethod),
      has_more: rows.length === (query.limit ?? 25),
      total_count: null,
      url,
    }
  },
  async get(tenantId: string, id: string) {
    const row = await paymentMethodsRepository.find(tenantId, id)
    if (!row) throw notFound()
    return serializePaymentMethod(row)
  },
  async create(tenantId: string, body: PaymentMethodCreateParams) {
    validateCredential(body)
    const id = generateId('PaymentMethod')
    const now = nowUnixSeconds()
    const credential = body.credential
    let sealedValue: string | null = null
    // `credentialType` and `credentialStorage` describe the secret that is
    // actually stored, never the instrument. A provider-tokenised card holds a
    // token, not a PAN, and saying otherwise would mislead every future
    // rotation and migration that keys off these two columns.
    let credentialType: 'CARD_PAN' | 'BANK_ACCOUNT_NUMBER' | 'PROVIDER_TOKEN' =
      'PROVIDER_TOKEN'
    let credentialStorage: 'WORKOS_VAULT' | 'LOCAL_KEY' | 'PROVIDER_TOKEN' =
      'PROVIDER_TOKEN'

    if (credential?.storage === 'vault') {
      const type: SealedCredentialType =
        body.type === 'CARD' ? 'card_pan' : 'bank_account_number'
      const sealed = await getSecureFieldProvider(
        tenantId,
        getVaultClient()
      ).seal(
        credential.value,
        credentialContext({ tenantId, paymentMethodId: id, type })
      )

      sealedValue = sealed.ciphertext
      credentialType = body.type === 'CARD' ? 'CARD_PAN' : 'BANK_ACCOUNT_NUMBER'
      // Which provider actually sealed it is decided by configuration at
      // runtime, so it is read back off the result rather than assumed.
      credentialStorage =
        sealed.provider === 'workos_vault' ? 'WORKOS_VAULT' : 'LOCAL_KEY'
    }
    const inputJson = (value: unknown) => value as Prisma.InputJsonValue
    const row = await prisma.$transaction(async (tx) => {
      const method = await tx.paymentMethod.create({
        data: {
          id,
          tenantId,
          customerId: body.customerId,
          type: body.type,
          status: 'ACTIVE',
          allowRedisplay: body.allowRedisplay ?? 'UNSPECIFIED',
          reusable: body.reusable ?? false,
          billingDetails: body.billingDetails
            ? inputJson(body.billingDetails)
            : undefined,
          card: body.card ? inputJson(body.card) : undefined,
          bankAccount: body.bankAccount
            ? inputJson(body.bankAccount)
            : undefined,
          wallet: body.wallet ? inputJson(body.wallet) : undefined,
          manual: body.manual ? inputJson(body.manual) : undefined,
          metadata: body.metadata ? inputJson(body.metadata) : undefined,
          displayLabel: body.card
            ? `${body.card.brand} •••• ${body.card.last4}`
            : body.bankAccount
              ? `•••• ${body.bankAccount.last4}`
              : body.manual?.displayName,
          expMonth: body.card?.expMonth,
          expYear: body.card?.expYear,
          provider:
            credential?.storage === 'provider_token'
              ? credential.provider
              : null,
          providerConnectionId:
            credential?.storage === 'provider_token'
              ? credential.providerConnectionId
              : null,
          createdAt: now,
          updatedAt: now,
        },
      })
      if (credential && credential.storage !== 'none')
        await tx.paymentCredential.create({
          data: {
            id: generateId('PaymentCredential'),
            tenantId,
            paymentMethodId: id,
            type: credentialType,
            storage: credentialStorage,
            sealedValue,
            providerToken:
              credential.storage === 'provider_token'
                ? credential.providerToken
                : null,
            provider:
              credential.storage === 'provider_token'
                ? credential.provider
                : null,
            createdAt: now,
          },
        })
      return method
    })
    return serializePaymentMethod(row)
  },
  async update(tenantId: string, id: string, body: PaymentMethodUpdateParams) {
    const result = await prisma.paymentMethod.updateMany({
      where: { tenantId, id, status: { not: 'DETACHED' } },
      data: {
        allowRedisplay: body.allowRedisplay,
        billingDetails: body.billingDetails as
          Prisma.InputJsonValue | undefined,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
        updatedAt: nowUnixSeconds(),
      },
    })
    if (!result.count) throw notFound()
    return this.get(tenantId, id)
  },
  async setDefault(tenantId: string, id: string) {
    const method = await paymentMethodsRepository.find(tenantId, id)
    if (!method) throw notFound()
    // An expired or failed instrument must not become the one a renewal is
    // charged to; only detaching it is a legal next step.
    if (method.status !== 'ACTIVE')
      throw appError('payment-method/not-active', {
        message: 'Only an active payment method can be made the default.',
        httpStatus: 409,
      })
    await prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({
        where: { tenantId, customerId: method.customerId, isDefault: true },
        data: { isDefault: false, updatedAt: nowUnixSeconds() },
      })
      await tx.paymentMethod.update({
        where: { id },
        data: { isDefault: true, updatedAt: nowUnixSeconds() },
      })
    })
    return this.get(tenantId, id)
  },
  async detach(tenantId: string, id: string) {
    const now = nowUnixSeconds()
    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.paymentMethod.updateMany({
        where: { tenantId, id, status: { not: 'DETACHED' } },
        data: {
          status: 'DETACHED',
          detachedAt: now,
          isDefault: false,
          updatedAt: now,
        },
      })
      if (!changed.count) return false
      await tx.paymentCredential.updateMany({
        where: { tenantId, paymentMethodId: id },
        data: { status: 'REVOKED', sealedValue: null, revokedAt: now },
      })
      return true
    })
    if (!result) throw notFound()
    return { object: 'payment_method' as const, id, deleted: true as const }
  },
}
