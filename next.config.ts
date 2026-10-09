import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['@aws-sdk/client-s3', 'pg'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
      { source: '/terms', destination: '/terms-and-conditions', permanent: true },
      { source: '/refund', destination: '/refund-and-cancellation-policy', permanent: true },
      { source: '/contact', destination: '/contact-us', permanent: true },
      { source: '/shipping', destination: '/shipping-and-delivery-policy', permanent: true },
      { source: '/disclaimer-policy', destination: '/disclaimer', permanent: true },
    ];
  },
};

export default nextConfig;
