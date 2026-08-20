/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/finance',
        destination: '/purchases?tab=finance',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
