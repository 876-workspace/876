import 'server-only'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown> & {
  requestId?: string
}

function emit(level: LogLevel, ctx: LogContext, msg: string): void {
  if (!shouldLog(level)) return

  const entry = { level, msg, ...ctx, time: Date.now() }
  const output =
    process.env.NODE_ENV === 'development'
      ? formatDevelopmentEntry(entry)
      : JSON.stringify(entry)

  if (level === 'error' || level === 'warn') {
    console.error(output)
  } else {
    console.log(output)
  }
}

function shouldLog(level: LogLevel): boolean {
  const configuredLevel = parseLogLevel(process.env.LOG_LEVEL)
  return levelRank[level] >= levelRank[configuredLevel]
}

function parseLogLevel(level: string | undefined): LogLevel {
  if (
    level === 'debug' ||
    level === 'info' ||
    level === 'warn' ||
    level === 'error'
  )
    return level

  return 'info'
}

function formatDevelopmentEntry(
  entry: LogContext & { level: LogLevel; msg: string; time: number }
): string {
  const { level, msg, time, ...ctx } = entry
  const context = Object.keys(ctx).length > 0 ? ` ${JSON.stringify(ctx)}` : ''
  return `[${new Date(time).toISOString()}] ${level.toUpperCase()} ${msg}${context}`
}

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export const logger = {
  debug: (ctx: LogContext, msg: string) => emit('debug', ctx, msg),
  info: (ctx: LogContext, msg: string) => emit('info', ctx, msg),
  warn: (ctx: LogContext, msg: string) => emit('warn', ctx, msg),
  error: (ctx: LogContext, msg: string) => emit('error', ctx, msg),
}
