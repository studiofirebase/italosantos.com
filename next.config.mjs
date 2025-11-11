/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações para build mais rápido e evitar timeouts
  staticPageGenerationTimeout: 180, // 3 minutos

  // Configurações para evitar timeouts no build
  generateBuildId: async () => 'build-' + Date.now(),

  experimental: {
    serverComponentsExternalPackages: ['canvas'],
    // Helps reduce bundle size for icon libraries and similar packages
    optimizePackageImports: ['lucide-react']
  },
  // Transform named imports from lucide-react to per-icon paths at build time
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/icons/{{member}}'
    }
  },
  images: {
    // You can disable Next.js image optimizer at build/run time by setting
    // DISABLE_NEXT_IMAGE_OPTIMIZER=true in the environment. When disabled,
    // Next will not proxy remote images (the browser will fetch them directly).
    unoptimized: process.env.DISABLE_NEXT_IMAGE_OPTIMIZER === 'true',

    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development'
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https: http:; media-src 'self' blob: https: http:; connect-src 'self' https: http: ws: wss:; frame-src 'self' https: http:; font-src 'self' https: data:;"
              : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https: http:; media-src 'self' blob: https: http:; connect-src 'self' https: http: ws: wss:; frame-src 'self' https: http:; font-src 'self' https: data:;"
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=(), geolocation=(), payment=*'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
