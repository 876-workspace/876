import { getSettings } from '../src/config/index.js'

const settings = getSettings()
const required = new Map<string, string | string[]>([
  ['API_URL', settings.identityApiUrl],
  ['BILLING_API_876_KEY', settings.identityApiKey],
  ['BILLING_DATABASE_URL', settings.databaseUrl],
  ['BILLING_INTERNAL_KEY', settings.internalKey],
  ['BILLING_SCHEDULER_KEY', settings.schedulerKey],
  ['CORS_ALLOWED_ORIGINS', settings.corsOrigins],
])
const missing = [...required]
  .filter(([, value]) =>
    Array.isArray(value) ? value.length === 0 : value.trim().length === 0
  )
  .map(([name]) => name)

if (settings.isProduction) {
  if (/localhost|127\.0\.0\.1/.test(settings.identityApiUrl))
    missing.push('API_URL')
  if (
    settings.corsOrigins.some((origin) => /localhost|127\.0\.0\.1/.test(origin))
  )
    missing.push('CORS_ALLOWED_ORIGINS')
}

const uniqueMissing = [...new Set(missing)].sort()
console.log(
  JSON.stringify({
    object: 'billing_environment_check',
    valid: uniqueMissing.length === 0,
    ...(uniqueMissing.length ? { missing: uniqueMissing } : {}),
    writer: settings.billingWriter,
  })
)
if (uniqueMissing.length) process.exitCode = 1
