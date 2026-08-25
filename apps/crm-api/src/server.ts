import { createApp } from './application.js'
import { disconnectDb } from './db/index.js'

const port = Number(process.env.PORT ?? 4010)
const app = createApp()
const server = app.listen(port, '0.0.0.0', () => {
  console.info(`CRM API listening on ${port}`)
})

async function shutdown() {
  server.close(async () => {
    await disconnectDb()
    process.exit(0)
  })
}

process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
