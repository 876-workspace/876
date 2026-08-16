import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '876 Invoice',
    short_name: 'Invoice',
    description: 'Commercial invoicing and billing for 876.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/pwa/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/pwa/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'New Invoice',
        short_name: 'New Invoice',
        description: 'Create a new draft invoice',
        url: '/invoices/new',
        icons: [{ src: '/pwa/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Customers',
        short_name: 'Customers',
        description: 'Manage customers and contacts',
        url: '/customers',
        icons: [{ src: '/pwa/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Reports',
        short_name: 'Reports',
        description: 'View sales and payment reports',
        url: '/reports',
        icons: [{ src: '/pwa/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
