import type { NextConfig } from 'next';
 
const nextConfig: NextConfig = {
  // The embedding model runs inside the Node server process; keep native packages out of the bundle.
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
 
export default nextConfig;
