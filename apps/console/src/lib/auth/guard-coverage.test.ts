import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const API_ROOT = resolve(process.cwd(), 'src/app/api')
const APP_ROOT = resolve(process.cwd(), 'src/app')

const PUBLIC_ROUTE_HANDLERS = {
  'health/route.ts': 'Health probes must be reachable before authentication.',
  'auth/[...path]/route.ts': 'The auth bridge establishes the Console session.',
  'uploadthing/route.ts':
    'Uploadthing is a protocol adapter with its own authentication.',
} as const

const PUBLIC_PAGES = {
  'login/page.tsx': 'Login must be reachable before authentication.',
  'access-denied/page.tsx': 'Denied users need a public terminal page.',
} as const

const ROUTE_GUARDS = [
  'requireConsolePermission',
  // Strictly stronger than requireConsolePermission: it checks
  // crm/requests.view first and then the caller's CRM effective permission,
  // failing closed when the app-access lookup errors.
  'requireConsoleCrmPermission',
  'requireConsoleCapability',
  'requireConsoleFeature',
  'requireNotepadMember',
  // audit-events authenticates every operator but deliberately requires no
  // capability permission because telemetry is emitted by every signed role.
  'isSignedSession',
] as const

const CRM_REQUEST_MUTATION_GUARDS = {
  'organizations/[id]/requests/route.ts': ['POST:requests.create'],
  'organizations/[id]/requests/[requestId]/route.ts': [
    'PATCH:requests.edit',
    'DELETE:requests.delete',
  ],
  'organizations/[id]/requests/[requestId]/events/route.ts': [
    'POST:events.create',
  ],
  'organizations/[id]/requests/[requestId]/events/[eventId]/route.ts': [
    'PATCH:events.edit',
    'DELETE:events.delete',
  ],
  'organizations/[id]/requests/[requestId]/notes/route.ts': [
    'POST:notes.create',
  ],
  'organizations/[id]/requests/[requestId]/notes/[noteId]/route.ts': [
    'PATCH:notes.edit',
    'DELETE:notes.delete',
  ],
  'organizations/[id]/requests/[requestId]/reminders/route.ts': [
    'POST:reminders.create',
  ],
  'organizations/[id]/requests/[requestId]/reminders/[reminderId]/route.ts': [
    'PATCH:reminders.edit',
    'DELETE:reminders.delete',
  ],
  'organizations/[id]/requests/[requestId]/tasks/route.ts': [
    'POST:tasks.create',
  ],
  'organizations/[id]/requests/[requestId]/tasks/[taskId]/route.ts': [
    'PATCH:tasks.edit',
    'DELETE:tasks.delete',
  ],
} as const

function walk(directory: string, name: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(full, name))
    else if (entry.name === name) files.push(full)
  }
  return files
}

function relativePath(root: string, file: string): string {
  return relative(root, file).split(sep).join('/')
}

describe('Console guard coverage', () => {
  it('requires an approved guard on every non-public route handler', () => {
    const unguarded = walk(API_ROOT, 'route.ts').flatMap((file) => {
      const path = relativePath(API_ROOT, file)
      if (path in PUBLIC_ROUTE_HANDLERS) return []
      const source = readFileSync(file, 'utf8')
      return ROUTE_GUARDS.some((guard) => source.includes(guard)) ? [] : [path]
    })

    expect(unguarded).toEqual([])
  })

  it('keeps the public route allow-list exact and non-stale', () => {
    expect(Object.keys(PUBLIC_ROUTE_HANDLERS)).toEqual([
      'health/route.ts',
      'auth/[...path]/route.ts',
      'uploadthing/route.ts',
    ])
    for (const path of Object.keys(PUBLIC_ROUTE_HANDLERS))
      expect(existsSync(join(API_ROOT, path)), path).toBe(true)
  })

  it('does not exempt audit event writes from authentication', () => {
    expect(Object.keys(PUBLIC_ROUTE_HANDLERS)).not.toContain(
      'audit-events/route.ts'
    )
    expect(
      readFileSync(join(API_ROOT, 'audit-events/route.ts'), 'utf8')
    ).toContain('isSignedSession')
  })

  it('allows only the login and access-denied pages outside the protected app tree', () => {
    const publicPages = walk(APP_ROOT, 'page.tsx')
      .filter((file) => !file.includes(`${sep}(app)${sep}`))
      .map((file) => relativePath(APP_ROOT, file))
      .sort()

    expect(publicPages).toEqual(['access-denied/page.tsx', 'login/page.tsx'])
  })

  it('keeps the public page allow-list exact and non-stale', () => {
    expect(Object.keys(PUBLIC_PAGES).sort()).toEqual([
      'access-denied/page.tsx',
      'login/page.tsx',
    ])
    for (const path of Object.keys(PUBLIC_PAGES))
      expect(existsSync(join(APP_ROOT, path)), path).toBe(true)
  })

  it('keeps the CRM request mutation route inventory exact', () => {
    expect(Object.keys(CRM_REQUEST_MUTATION_GUARDS).sort()).toEqual(
      walk(API_ROOT, 'route.ts')
        .map((file) => relativePath(API_ROOT, file))
        .filter((path) => path.includes('/requests/'))
        .filter((path) => {
          const source = readFileSync(join(API_ROOT, path), 'utf8')
          return /export async function (POST|PATCH|DELETE)/.test(source)
        })
        .sort()
    )
  })

  it('requires the CRM dual gate in every mutating request handler', () => {
    for (const path of Object.keys(CRM_REQUEST_MUTATION_GUARDS)) {
      const source = readFileSync(join(API_ROOT, path), 'utf8')
      const mutationCount = [
        ...source.matchAll(/export async function (POST|PATCH|DELETE)/g),
      ].length
      expect(
        [...source.matchAll(/requireConsoleCrmPermission\(/g)].length,
        path
      ).toBe(mutationCount)
    }
  })

  it('pins each mutating request handler to its exact CRM capability', () => {
    for (const [path, requirements] of Object.entries(
      CRM_REQUEST_MUTATION_GUARDS
    )) {
      const source = readFileSync(join(API_ROOT, path), 'utf8')
      for (const requirement of requirements) {
        const [method, permission] = requirement.split(':')
        const handler = source.slice(source.indexOf(`function ${method}`))
        expect(handler, requirement).toContain(`'${permission}'`)
      }
    }
  })

  it('authorizes CRM routes on Console permissions alone, at the operator tier', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/lib/auth/route-guard.ts'),
      'utf8'
    )

    expect(source).toContain("requireConsolePermission('crm/requests.view')")

    // Console acts on 876's authority across every organization. Reaching into
    // the target organization's app-access plane would make support depend on a
    // grant that organization can revoke, and cannot work cross-org at all
    // (`.claude/rules/access-tiers.md`).
    expect(source).not.toContain("appSlug: '876-crm'")
    expect(source).not.toContain('memberships.list')
    expect(source).not.toContain("'crm/requests.view': 'requests")
  })
})
