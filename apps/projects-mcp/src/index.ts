import { serveStdio } from '@modelcontextprotocol/server/stdio'

import { loadConfig } from './config'
import { buildProjectsMcpServer } from './server'

const config = loadConfig()

const handle = serveStdio(() => buildProjectsMcpServer(config), {
  legacy: 'serve',
  onerror: (error) => {
    console.error('Projects MCP server error:', error)
  },
})

console.error(
  '876 Projects MCP server running on stdio (MCP 2026-07-28 + legacy)'
)

const shutdown = async () => {
  try {
    await handle.close()
  } catch {
    // Ignore close errors on exit
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
