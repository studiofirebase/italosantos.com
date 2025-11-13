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
      // Apple Pay domain verification
      {
        source: '/.well-known/apple-developer-merchantid-domain-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Google Pay asset links
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      },
      // Headers gerais
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
              ? "default-src 'self'; object-src 'self' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https: https://translate.google.com https://translate.googleapis.com; style-src 'self' 'unsafe-inline' https: https://translate.googleapis.com; img-src 'self' data: blob: https: http: https://translate.google.com https://www.gstatic.com; media-src 'self' blob: https: http:; connect-src 'self' https: http: ws: wss: https://translate.googleapis.com; frame-src 'self' https: http: https://translate.google.com https://translate.googleapis.com; font-src 'self' https: data: https://fonts.gstatic.com;"
              : "default-src 'self'; object-src 'self' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https: https://translate.google.com https://translate.googleapis.com; style-src 'self' 'unsafe-inline' https: https://translate.googleapis.com; img-src 'self' data: blob: https: http: https://translate.google.com https://www.gstatic.com; media-src 'self' blob: https: http:; connect-src 'self' https: http: ws: wss: https://translate.googleapis.com; frame-src 'self' https: http: https://translate.google.com https://translate.googleapis.com; font-src 'self' https: data: https://fonts.gstatic.com;"
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
