import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'encoding')
    return config
  },
  // proxy /api/* to express backend (needed on fly.io where only one port is exposed)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:7301/api/:path*',
      },
    ]
  },
}

export default nextConfig
