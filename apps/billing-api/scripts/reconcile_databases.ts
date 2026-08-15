import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'

import pg from 'pg'

type Digest = { table: string; rows: number; sha256: string }

function values(name: string): string[] {
  const result: string[] = []
  process.argv.forEach((value, index) => {
    if (value === name && process.argv[index + 1]) result.push(process.argv[index + 1]!)
  })
  return result
}

function numberValue(name: string, fallback: number): number {
  const index = process.argv.indexOf(name)
  return index < 0 ? fallback : Number(process.argv[index + 1])
}

function quote(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function schemaTables(): Promise<string[]> {
  const directory = new URL('../prisma/schema/', import.meta.url)
  const names = new Set<string>()
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.prisma')) continue
    const source = await readFile(new URL(file, directory), 'utf8')
    for (const match of source.matchAll(/@@map\("([^"]+)"\)/g)) names.add(match[1]!)
  }
  return [...names].sort()
}

async function tableShape(client: pg.Client, table: string) {
  const columns = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  )
  const primary = await client.query<{ column_name: string }>(
    `SELECT a.attname AS column_name
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN unnest(i.indkey) WITH ORDINALITY AS key(attnum, ordering) ON TRUE
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = key.attnum
      WHERE n.nspname = 'public' AND c.relname = $1 AND i.indisprimary
      ORDER BY key.ordering`,
    [table]
  )
  if (!columns.rowCount) throw new Error(`Billing table ${table} is missing.`)
  if (!primary.rowCount) throw new Error(`Billing table ${table} has no primary key.`)
  return {
    columns: columns.rows.map((row) => row.column_name),
    primary: primary.rows.map((row) => row.column_name),
  }
}

async function digestTable(client: pg.Client, table: string, batchSize: number) {
  const { columns, primary } = await tableShape(client, table)
  const projection = columns.map((column) => `${quote(column)}::text`).join(', ')
  const ordering = primary.map(quote).join(', ')
  const cursor = `billing_reconcile_${createHash('sha256').update(table).digest('hex').slice(0, 16)}`
  await client.query(
    `DECLARE ${quote(cursor)} NO SCROLL CURSOR FOR SELECT ${projection} FROM ${quote(table)} ORDER BY ${ordering}`
  )
  const hash = createHash('sha256')
  let rows = 0
  try {
    while (true) {
      const batch = await client.query({
        text: `FETCH FORWARD ${batchSize} FROM ${quote(cursor)}`,
        rowMode: 'array',
      })
      if (batch.rows.length === 0) break
      for (const row of batch.rows as Array<Array<string | null>>) {
        const payload = Buffer.from(JSON.stringify(row), 'utf8')
        const length = Buffer.alloc(8)
        length.writeBigUInt64BE(BigInt(payload.length))
        hash.update(length).update(payload)
        rows += 1
      }
    }
  } finally {
    await client.query(`CLOSE ${quote(cursor)}`)
  }
  return { table, rows, sha256: hash.digest('hex') } satisfies Digest
}

async function snapshot(url: string, tables: string[], batchSize: number) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const digests: Digest[] = []
    for (const table of tables) digests.push(await digestTable(client, table, batchSize))
    await client.query('COMMIT')
    return { tables: digests }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    await client.end()
  }
}

const sourceUrl = process.env.BILLING_LEGACY_DATABASE_URL ?? ''
const targetUrl = process.env.BILLING_DATABASE_URL ?? ''
const batchSize = numberValue('--batch-size', 500)
let selected = values('--table')

if (!sourceUrl || !targetUrl || process.env.BILLING_WRITER !== 'none') {
  console.log(JSON.stringify({
    object: 'billing_reconciliation',
    matches: false,
    error:
      'BILLING_LEGACY_DATABASE_URL, BILLING_DATABASE_URL, and BILLING_WRITER=none are required.',
  }))
  process.exitCode = 2
} else if (!Number.isInteger(batchSize) || batchSize < 1) {
  console.log(JSON.stringify({ object: 'billing_reconciliation', matches: false, error: 'Invalid batch size.' }))
  process.exitCode = 2
} else {
  try {
    const known = await schemaTables()
    if (selected.length === 0) selected = known
    const unknown = selected.filter((table) => !known.includes(table))
    if (unknown.length) throw new Error(`Unknown Billing tables: ${unknown.join(', ')}`)
    const [source, target] = await Promise.all([
      snapshot(sourceUrl, selected, batchSize),
      snapshot(targetUrl, selected, batchSize),
    ])
    const targetByTable = new Map(target.tables.map((table) => [table.table, table]))
    const mismatchedTables = source.tables
      .filter((table) => JSON.stringify(table) !== JSON.stringify(targetByTable.get(table.table)))
      .map((table) => table.table)
    const report = {
      object: 'billing_reconciliation',
      matches: mismatchedTables.length === 0,
      mismatched_tables: mismatchedTables,
      source,
      target,
    }
    console.log(JSON.stringify(report))
    if (!report.matches) process.exitCode = 1
  } catch (error) {
    console.log(JSON.stringify({
      object: 'billing_reconciliation',
      matches: false,
      error: `Reconciliation failed (${error instanceof Error ? error.name : 'Error'}).`,
    }))
    process.exitCode = 2
  }
}
