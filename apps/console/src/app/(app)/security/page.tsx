import Link from 'next/link'
import { Page } from '@876/ui/page'

export const metadata = { title: 'Security' }

// Devices are deliberately absent: a device belongs to a user, so it is reached
// from that user's Security tab. Only the two views that span accounts — the
// sign-in history (which includes attempts that never resolved to a user) and
// the session list — are platform-level.
const links = [
  { title: 'Sign-ins', href: '/security/sign-ins' },
  { title: 'Sessions', href: '/sessions' },
]

export default function SecurityPage() {
  return (
    <Page hub>
      <h1 className="876-page-title mb-6">Security</h1>
      <div className="gap-6 sm:columns-2 lg:columns-3">
        {links.map((link) => (
          <Link
            className="876-card 876-card-interactive mb-6 block break-inside-avoid p-5 font-medium"
            href={link.href}
            key={link.href}
          >
            {link.title}
          </Link>
        ))}
      </div>
    </Page>
  )
}
