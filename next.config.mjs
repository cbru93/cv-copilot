/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // experimental: {
  //   serverActions: {
  //     // You can configure bodySizeLimit and allowedOrigins here if needed
  //   },
  // },
  webpack: (config) => {
    // This is to handle the pdf-parse dependency which uses Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    return config;
  },
};

export default nextConfig;

