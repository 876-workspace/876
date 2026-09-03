import { describe, expect, it } from 'vitest'

import { appPermissionCatalogs, projectsPermissionCatalog } from './catalogs'

describe('projectsPermissionCatalog', () => {
  it('declares the app slug as exactly 876-projects', () => {
    expect(projectsPermissionCatalog.app).toBe('876-projects')
  })

  it('declares exactly the eight module keys in declaration order', () => {
    expect(projectsPermissionCatalog.modules.map((module) => module.key)).toEqual([
      'dashboard',
      'projects',
      'issues',
      'comments',
      'labels',
      'members',
      'reports',
      'settings',
    ])
  })

  it('ensures every permission key matches the kebab-module.kebab-action contract', () => {
    const keys = projectsPermissionCatalog.permissions.map((p) => p.key)
    const contract = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.every((key) => contract.test(key))).toBe(true)
  })

  it('declares unique permission keys across the whole catalog', () => {
    const keys = projectsPermissionCatalog.permissions.map((p) => p.key)
    expect(keys).toHaveLength(25)
    expect(new Set(keys).size).toBe(25)
  })

  it('flags destructive delete permissions as isDangerous', () => {
    const dangerousKeys = [
      'projects.delete',
      'issues.delete',
      'comments.delete',
      'labels.delete',
      'members.delete',
    ]

    for (const key of dangerousKeys) {
      const permission = projectsPermissionCatalog.permissions.find(
        (p) => p.key === key
      )
      expect(permission?.isDangerous).toBe(true)
    }

    const actualDangerousKeys = projectsPermissionCatalog.permissions
      .filter((p) => p.isDangerous)
      .map((p) => p.key)
      .sort()

    expect(actualDangerousKeys).toEqual([...dangerousKeys].sort())
  })

  it('verifies projects.archive exists and is not flagged dangerous', () => {
    const archivePermission = projectsPermissionCatalog.permissions.find(
      (p) => p.key === 'projects.archive'
    )
    expect(archivePermission?.key).toBe('projects.archive')
    expect(archivePermission?.action).toBe('archive')
    expect(archivePermission?.isDangerous).toBe(false)
  })

  it('assigns module position values strictly increasing from 0 in declaration order', () => {
    const positions = projectsPermissionCatalog.modules.map(
      (module) => module.position
    )
    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('registers projectsPermissionCatalog in appPermissionCatalogs under 876-projects', () => {
    expect(appPermissionCatalogs['876-projects']).toBe(projectsPermissionCatalog)
  })
})
