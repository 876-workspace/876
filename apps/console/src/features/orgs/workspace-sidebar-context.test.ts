import { describe, expect, it } from 'vitest'

import { PLATFORM_CONTEXT_KEY } from '@/components/shell/sidebar-context'
import { contextEntries } from '@/components/shell/sidebar-context'
import { findAppWorkspace, workspaceSectionLinks } from './app-workspaces'
import { workspaceSidebarContext } from './workspace-sidebar-context'

const CRM = findAppWorkspace('crm')!

describe('workspaceSidebarContext', () => {
  it('builds the rail from the links it is given, in order', () => {
    const links = workspaceSectionLinks('acme', CRM)
    const context = workspaceSidebarContext('acme', CRM, links, 'Acme Ltd')

    expect(contextEntries(context).map((entry) => entry.href)).toEqual(
      links.map((link) => link.href)
    )
    expect(contextEntries(context).map((entry) => entry.title)).toEqual(
      links.map((link) => link.label)
    )
  })

  // The rail is the only chrome naming the organization once the workspace is a
  // top-level route, so an unnamed context leaves an operator unable to tell
  // whose CRM they are looking at.
  it('names the product and the organization it belongs to', () => {
    const context = workspaceSidebarContext(
      'acme',
      CRM,
      workspaceSectionLinks('acme', CRM),
      'Acme Ltd'
    )

    expect(context.title).toBe(CRM.label)
    expect(context.subtitle).toBe('Acme Ltd')
  })

  it('opens at the workspace base and returns to the platform rail', () => {
    const context = workspaceSidebarContext(
      'acme',
      CRM,
      workspaceSectionLinks('acme', CRM),
      'Acme Ltd'
    )

    expect(context.kind).toBe('workspace')
    expect(context.href).toBe('/workspace/acme/crm')
    expect(context.parentKey).toBe(PLATFORM_CONTEXT_KEY)
  })

  // Two organizations must not collide in the stack, or navigating between
  // their workspaces would look like staying in one context.
  it('keys the context by organization as well as product', () => {
    const acme = workspaceSidebarContext('acme', CRM, [], 'Acme Ltd')
    const other = workspaceSidebarContext('globex', CRM, [], 'Globex')

    expect(acme.key).not.toBe(other.key)
  })

  it('declares an empty context rather than dropping it when there are no links', () => {
    const context = workspaceSidebarContext('acme', CRM, [], 'Acme Ltd')

    expect(contextEntries(context)).toEqual([])
    expect(context.href).toBe('/workspace/acme/crm')
  })
})
