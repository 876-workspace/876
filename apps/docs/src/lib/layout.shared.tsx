import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

/**
 * Shared layout options (navbar + links) used by both the home and docs
 * layouts.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-semibold">
          876 <span className="text-fd-muted-foreground">SDK</span>
        </span>
      ),
    },
    links: [
      {
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
      },
    ],
  }
}
