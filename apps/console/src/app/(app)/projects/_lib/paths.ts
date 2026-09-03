/**
 * Console's own Projects root. Every href in this section hangs off it.
 *
 * It lives apart from `base.ts` because the section's toolbars are client
 * components: `base.ts` is `server-only`, and importing it from a client
 * module is a build error even when the value taken from it is a plain string.
 */
export const PLATFORM_PROJECTS_BASE = '/projects'
