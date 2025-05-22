import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // experimental: {
  //   serverActions: {
  //     // You can configure bodySizeLimit and allowedOrigins here if needed
  //   },
  // },
};

export default nextConfig; 