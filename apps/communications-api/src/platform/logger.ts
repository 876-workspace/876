import pino, { type Logger } from 'pino'

let rootLogger: Logger = pino({ level: 'info' })

export function configureLogging(input: {
  environment: string
  logLevel: string
}) {
  rootLogger = pino({
    level: input.logLevel,
    base: { service: 'communications-api', environment: input.environment },
  })
}

export function getLogger(component: string): Logger {
  return rootLogger.child({ component })
}
