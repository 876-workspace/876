import Link from 'next/link'

const SECTIONS = [
  {
    title: 'Getting Started',
    description:
      'Install the SDK, configure a client, and ship your first login.',
    href: '/docs/getting-started',
  },
  {
    title: 'Auth Client',
    description:
      'Login, registration, sessions, recovery, magic OTP, and more.',
    href: '/docs/auth',
  },
  {
    title: 'OAuth Client',
    description: 'PKCE flows, token exchange, userinfo, and OIDC discovery.',
    href: '/docs/oauth',
  },
  {
    title: 'Reference',
    description: 'Every type, the result envelope, and the full error catalog.',
    href: '/docs/reference',
  },
]

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
        <span className="border-fd-border bg-fd-muted/40 text-fd-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
          @876/sdk · request-only auth &amp; OAuth
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          The 876 SDK Documentation
        </h1>
        <p className="text-fd-muted-foreground max-w-2xl text-lg">
          Typed, runtime-agnostic clients for first-party authentication and the
          876 OAuth provider. Every method documented with examples, full type
          references, and the underlying API contract.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/getting-started"
            className="bg-fd-primary text-fd-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
          <Link
            href="/docs/auth/login"
            className="border-fd-border hover:bg-fd-accent rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Browse the API
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group border-fd-border bg-fd-card/40 hover:border-fd-primary/50 hover:bg-fd-accent/40 rounded-xl border p-6 transition-colors"
          >
            <h2 className="group-hover:text-fd-primary mb-1 font-semibold">
              {s.title}
            </h2>
            <p className="text-fd-muted-foreground text-sm">{s.description}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
