import Link from 'next/link'
import { ChevronRight, ShieldCheck } from '@876/ui/icons'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import {
  Page,
  PageBreadcrumb,
  PageHeader,
  PageTitle,
  PageDescription,
} from '@876/ui/page'

export const metadata = { title: 'Security - Settings' }

const SECURITY_SECTIONS = [
  {
    label: 'Sessions',
    fields: [
      {
        name: 'Session duration',
        description: 'Maximum lifetime for an authenticated session.',
        value: '30 days',
        status: 'configured' as const,
      },
      {
        name: 'Idle timeout',
        description:
          'Duration of inactivity before a session is automatically invalidated.',
        value: '7 days',
        status: 'configured' as const,
      },
    ],
  },
  {
    label: 'Authentication',
    fields: [
      {
        name: 'Multi-factor authentication',
        description: 'Require MFA for all Console accounts.',
        value: 'Enforced',
        status: 'configured' as const,
      },
      {
        name: 'Allowed auth methods',
        description: 'Sign-in methods available to platform users.',
        value: 'Email / Password',
        status: 'configured' as const,
      },
    ],
  },
  {
    label: 'OAuth',
    fields: [
      {
        name: 'OAuth Authorization Server',
        description:
          'Third-party "Sign in with 876" capability. Dormant — reserved for future use.',
        value: 'Disabled',
        status: 'dormant' as const,
      },
    ],
  },
]

export default function SecuritySettingsPage() {
  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />

      <PageHeader className="mb-8">
        <PageTitle>Security</PageTitle>
        <PageDescription>
          Auth policies, session configuration, and OAuth settings.
        </PageDescription>
      </PageHeader>

      <div className="max-w-2xl space-y-8">
        {/* Reserved Usernames */}
        <div>
          <h2 className="876-section-title mb-3">Usernames</h2>
          <Link
            href="/settings/security/usernames"
            className="876-card 876-card-interactive flex items-center justify-between px-5 py-4 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">Reserved Usernames</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                Protect system handles, brand names, and routing paths from
                being claimed during sign-up.
              </p>
            </div>
            <ChevronRight className="text-muted-foreground ml-4 size-4 shrink-0" />
          </Link>
        </div>

        {SECURITY_SECTIONS.map((section) => (
          <div key={section.label}>
            <h2 className="876-section-title mb-3">{section.label}</h2>
            <div className="876-card divide-y">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{field.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                      {field.description}
                    </p>
                  </div>
                  <span
                    className={
                      field.status === 'dormant'
                        ? 'bg-muted text-muted-foreground shrink-0 rounded-md px-2.5 py-1 text-xs'
                        : 'bg-muted shrink-0 rounded-md px-2.5 py-1 font-mono text-xs'
                    }
                  >
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle>Advanced security controls coming soon</EmptyTitle>
            <EmptyDescription>
              IP allowlisting, rate-limit overrides, and granular OAuth client
              management will appear here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </div>
    </Page>
  )
}
