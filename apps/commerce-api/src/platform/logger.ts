import { pino, type Logger } from 'pino'

let root: Logger | undefined

export function configureLogging(options: {
  environment: string
  logLevel: string
}): void {
  root = pino({
    level: options.logLevel,
    base: { service: 'commerce-api', environment: options.environment },
  })
}

export function getLogger(scope: string): Logger {
  return (root ?? pino()).child({ scope })
}
