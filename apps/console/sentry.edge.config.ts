import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email
      delete event.user.username
      delete event.user.ip_address
    }

    return event
  },
})
