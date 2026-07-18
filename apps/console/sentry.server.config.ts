import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend(event) {
    scrubEvent(event)
    return event
  },
})

function scrubEvent(
  event: Parameters<
    NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>
  >[0]
) {
  if (event.user) {
    delete event.user.email
    delete event.user.username
    delete event.user.ip_address
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    const data = breadcrumb.data
    if (!data) continue

    delete data.Authorization
    delete data.authorization
    delete data.Cookie
    delete data.cookie
    delete data['Set-Cookie']
    delete data['set-cookie']
    delete data['x-internal-key']
    delete data['X-Internal-Key']
    delete data['x-api-key']
    delete data['X-API-Key']
    delete data['X-876-API-Key']
  }
}
