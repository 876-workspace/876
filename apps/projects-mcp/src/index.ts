import { create876ProjectsOperatorClient } from '@876/projects/operator'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { loadConfig } from './config'
import { HANDLERS } from './handlers'
import { TOOLS } from './tools'

const config = loadConfig()

const client = create876ProjectsOperatorClient({
  baseUrl: config.apiUrl,
  internalKey: config.internalKey,
})

const server = new Server(
  {
    name: '876-projects',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const handler = HANDLERS[request.params.name]
    if (!handler) {
      return {
        isError: true,
        content: [
          { type: 'text', text: `Unknown tool: ${request.params.name}` },
        ],
      }
    }

    try {
      return await handler(client, config, request.params.arguments)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        isError: true,
        content: [{ type: 'text', text: `Internal tool error: ${message}` }],
      }
    }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('876 Projects MCP server running on stdio')

const shutdown = async () => {
  try {
    await server.close()
  } catch {
    // Ignore close errors on exit
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
