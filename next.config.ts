import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // This allows requests from the Firebase Studio development environment.
    allowedDevOrigins: ["*.cloudworkstations.dev"],
  },
  webpack: (config, { isServer }) => {
    // This is required to make ffmpeg.wasm work.
    config.resolve.fallback = { fs: false, path: false, crypto: false };
    
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // This is the key change to prevent Webpack from trying to parse the ffmpeg library.
    config.module.rules.push({
      test: /@ffmpeg\/ffmpeg/,
      parser: {
        amd: false,
      },
    });

    return config;
  },
};

export default nextConfig;
