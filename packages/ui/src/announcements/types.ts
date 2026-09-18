/**
 * The shared announcement contract.
 *
 * An announcement is a short, app-wide message shown in a bar at the top of the
 * content column: the app is offline, a new version is waiting, a promotion is
 * running, scheduled maintenance is coming. It never replaces the page — the
 * screen the user was on stays mounted and usable underneath.
 *
 * Everything here is plain, structurally cloneable data so a server component
 * can resolve announcements and hand them to the client region. Actions are
 * therefore an href or a named runtime action key, never a function
 * (`.claude/rules/production-render-errors.md` Rule 1).
 */

/** Visual weight. Maps onto the platform's existing status colours. */
export type AnnouncementTone =
  'info' | 'success' | 'warning' | 'critical' | 'promo'

/**
 * Runtime behaviours the region itself can perform, named as data so a remote
 * (console-authored) announcement can request one without shipping code.
 */
export type AnnouncementActionKey = 'reload' | 'apply-update' | 'dismiss'

export type AnnouncementAction =
  | {
      label: string
      /** Same-origin path, or an absolute URL when `external` is set. */
      href: string
      external?: boolean
      action?: never
    }
  | {
      label: string
      action: AnnouncementActionKey
      href?: never
      external?: never
    }

export interface Announcement {
  /**
   * Durable identifier. Dismissal is remembered per id, so a persistent
   * announcement must keep the same id across renders and deploys.
   */
  id: string
  tone: AnnouncementTone
  /** One short line. No paragraphs — see `CLAUDE.md` → UI Copy. */
  message: string
  /** Optional lead-in rendered in medium weight before the message. */
  title?: string
  actions?: AnnouncementAction[]
  /**
   * Whether the viewer may close it. A connectivity announcement is not
   * dismissible: it disappears when the condition clears, not when it is
   * waved away.
   */
  dismissible?: boolean
  /** Higher sorts first. Runtime announcements use the constants below. */
  priority?: number
}

/** Runtime announcements outrank editorial ones; offline outranks everything. */
export const ANNOUNCEMENT_PRIORITY = {
  offline: 300,
  update: 200,
  editorial: 100,
} as const
