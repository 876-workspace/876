import { disconnectDb } from '../db/index.js'
import { syncActiveConnections } from '../modules/sync-connections/index.js'

try {
  const result = await syncActiveConnections()
  console.info('work.sync.completed', result)
  if (result.failed > 0) process.exitCode = 1
} catch (error) {
  console.error('work.sync.failed', error)
  process.exitCode = 1
} finally {
  await disconnectDb()
}
