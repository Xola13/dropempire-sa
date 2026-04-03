import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.aliexpress.com' },
      { protocol: 'https', hostname: '**.alicdn.com' },
      { protocol: 'https', hostname: '**.cjdropshipping.com' },
      { protocol: 'https', hostname: '**.makro.co.za' },
      { protocol: 'https', hostname: '**.game.co.za' },
      { protocol: 'https', hostname: '**.bidorbuy.co.za' },
      { protocol: 'https', hostname: '**.bob-media.co.za' },
      { protocol: 'https', hostname: '**.takealot.com' },
      { protocol: 'https', hostname: 'media.takealot.com' },
      { protocol: 'https', hostname: 'cdn.takealot.com' },
      { protocol: 'https', hostname: '**.hivve.co.za' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  serverExternalPackages: ['playwright'],
}

export default nextConfig
