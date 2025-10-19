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
  webpack: (config, { isServer }) => {
    // See https://github.com/ffmpegwasm/ffmpeg.wasm/issues/738
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "fs": false,
            "path": false
        }
    }
    config.module.rules.push({
      test: /node_modules\/@ffmpeg\/ffmpeg\/dist\/esm\/worker\.js$/,
      loader: 'string-replace-loader',
      options: {
        search: 'import.meta.url',
        replace: 'self.location.href',
      },
    });
    config.module.rules.push({
      test: /node_modules\/@ffmpeg\/ffmpeg\/dist\/esm\/classes\.js$/,
      loader: 'string-replace-loader',
      options: {
        search: 'import.meta.url',
        replace: 'self.location.href',
      },
    });
     config.output.publicPath = '/_next/';
    return config
  },
};

export default nextConfig;
