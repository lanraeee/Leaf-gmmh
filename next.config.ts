import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  // Serve uploaded files securely — in production route through a signed-URL endpoint
  // to avoid public exposure. For development, files are served from /uploads.
}

export default nextConfig
