export interface Config {
  apiUrl: string
  internalKey: string
  organizationId: string
  defaultUserId?: string
}

export class ConfigError extends Error {
  constructor(
    readonly variable: string,
    message: string
  ) {
    super(message)
    this.name = 'ConfigError'
  }
}

export function validateConfig(
  env: Record<string, string | undefined>
): Config {
  const apiUrl = env.PROJECTS_API_URL?.trim()
  if (!apiUrl) {
    throw new ConfigError(
      'PROJECTS_API_URL',
      'Missing required environment variable: PROJECTS_API_URL'
    )
  }

  const internalKey = env.PROJECTS_INTERNAL_KEY?.trim()
  if (!internalKey) {
    throw new ConfigError(
      'PROJECTS_INTERNAL_KEY',
      'Missing required environment variable: PROJECTS_INTERNAL_KEY'
    )
  }

  const organizationId = env.PROJECTS_ORGANIZATION_ID?.trim()
  if (!organizationId) {
    throw new ConfigError(
      'PROJECTS_ORGANIZATION_ID',
      'Missing required environment variable: PROJECTS_ORGANIZATION_ID'
    )
  }

  const defaultUserId = env.PROJECTS_DEFAULT_USER_ID?.trim() || undefined

  return {
    apiUrl,
    internalKey,
    organizationId,
    defaultUserId,
  }
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env
): Config {
  try {
    return validateConfig(env)
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message)
      process.exit(1)
    }
    throw error
  }
}
