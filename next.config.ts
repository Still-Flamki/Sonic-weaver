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
  webpack(config, { isServer }) {
    if (!isServer) {
        config.resolve.fallback = {
            fs: false,
            path: false,
        };
    }
    
    config.module.rules.push({
        test: /classes\.js$/,
        loader: 'string-replace-loader',
        options: {
            search: 'new Worker(new URL(classWorkerURL, import.meta.url),',
            replace: 'new Worker(new URL(classWorkerURL, self.location.href),',
        }
    });
    
    return config;
  },
};

export default nextConfig;
