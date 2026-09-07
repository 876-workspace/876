import {
  create876ProjectsOperatorClient,
  type ProjectsOperatorClient,
} from '@876/projects/operator'
import { McpServer } from '@modelcontextprotocol/server'

import type { Config } from './config'
import { PROJECTS_SERVER_INSTRUCTIONS } from './instructions'
import { registerProjectTools } from './tool-definitions'

/**
 * Builds and returns a configured McpServer instance for 876 Projects.
 * Separated from transport connection to allow server creation in tests and stdio runners.
 */
export function buildProjectsMcpServer(
  config: Config,
  customClient?: ProjectsOperatorClient
): McpServer {
  const client =
    customClient ??
    create876ProjectsOperatorClient({
      baseUrl: config.apiUrl,
      internalKey: config.internalKey,
    })

  const server = new McpServer(
    {
      name: '876-projects',
      version: '0.2.0',
    },
    {
      instructions: PROJECTS_SERVER_INSTRUCTIONS,
    }
  )

  registerProjectTools(server, client, config)

  return server
}
