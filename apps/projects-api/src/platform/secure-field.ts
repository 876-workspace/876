import {
  resolveSecureFieldProvider,
  type SealedValue,
  type SecureFieldProvider,
} from '@876/core/crypto/secure-field'

export {
  SecureFieldError,
  type SealedValue,
  type SecureFieldContext,
  type SecureFieldProvider,
} from '@876/core/crypto/secure-field'

export function automationWebhookContext(params: {
  tenantId: string
  ruleId: string
}): Record<string, string> {
  return {
    tenant_id: params.tenantId,
    automation_rule_id: params.ruleId,
    type: 'webhook-secret',
  }
}

let cachedProvider: SecureFieldProvider | null = null

export function getAutomationSecureFieldProvider(): SecureFieldProvider {
  if (!cachedProvider) {
    cachedProvider = resolveSecureFieldProvider({
      vaultEnabled: false,
      secureFieldKey: process.env.SECURE_FIELD_KEY,
    })
  }
  return cachedProvider
}

export function resetAutomationSecureFieldProvider(): void {
  cachedProvider = null
}

export async function sealWebhookSecret(
  tenantId: string,
  ruleId: string,
  plaintext: string
): Promise<SealedValue> {
  return getAutomationSecureFieldProvider().seal(
    plaintext,
    automationWebhookContext({ tenantId, ruleId })
  )
}

export async function unsealWebhookSecret(
  tenantId: string,
  ruleId: string,
  sealed: SealedValue
): Promise<string> {
  return getAutomationSecureFieldProvider().unseal(
    sealed,
    automationWebhookContext({ tenantId, ruleId })
  )
}
