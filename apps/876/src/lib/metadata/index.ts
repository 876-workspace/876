import type { Metadata } from 'next'

export const siteConfig = {
  name: '876',
  description:
    'Secure, unified authentication for 876 — manage your account, permissions, and connected apps.',
  // Trim + `||` (not `??`): an env var set to an empty string on the host would
  // slip past `??` and make `new URL('')` below throw at render.
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://876.dev',
}

/** Base metadata spread by every page-level metadata export. */
export const baseMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    siteName: siteConfig.name,
    type: 'website',
  },
  twitter: {
    card: 'summary',
  },
}

/** Metadata for private authenticated pages (no indexing). */
export function privateMetadata(title: string): Metadata {
  return {
    ...baseMetadata,
    title: `${title} | ${siteConfig.name}`,
    robots: { index: false, follow: false },
  }
}

/** Metadata for public-facing pages (fully indexed with OG). */
export function publicMetadata(title: string, description?: string): Metadata {
  const desc = description ?? siteConfig.description
  return {
    ...baseMetadata,
    title: `${title} | ${siteConfig.name}`,
    description: desc,
    openGraph: {
      ...baseMetadata.openGraph,
      title: `${title} | ${siteConfig.name}`,
      description: desc,
    },
  }
}
