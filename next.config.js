const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // 1. Force standard folder structure compatibility for your Pages deployment pipeline
  output: 'standalone', 

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 2. Prevent dynamic edge runtime crashes caused by serverless image processing loops
  images: {
    unoptimized: true,
  },

  experimental: {
    webpackBuildWorker: false,
    webpackMemoryOptimizations: false,
  },

  // 3. Keep Webpack lean. Do not block web-standard polyfills that Turso & Drizzle require.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Only mock purely binary/native local OS extensions that cannot physically cross-compile to Web Workers
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        worker_threads: false,
        perf_hooks: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    
    return config;
  },
};

module.exports = withPWA(nextConfig);
