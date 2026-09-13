export type CommerceApiConfig = {
  port: number
  environment: string
  logLevel: string
}

export function getConfig(env = process.env): CommerceApiConfig {
  const port = Number(env.PORT ?? 4040)
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new Error('PORT must be a valid TCP port.')

  return {
    port,
    environment: env.ENVIRONMENT ?? 'development',
    logLevel: env.LOG_LEVEL ?? 'info',
  }
}
