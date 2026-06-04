import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Glizzy Golf League',
    short_name: 'Glizzy Golf',
    description: '9-hole weekly stroke play — handicap-adjusted net scoring.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0fdf4',
    theme_color: '#166534',
    categories: ['sports', 'games'],
    icons: [
      { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'On Course',    short_name: 'On Course',    url: '/live',    description: 'Start or track a live round' },
      { name: 'Standings',   short_name: 'Standings',   url: '/',        description: 'View league standings'       },
      { name: 'Record Round', short_name: 'Record',      url: '/record',  description: 'Log a completed round'      },
    ],
  };
}
