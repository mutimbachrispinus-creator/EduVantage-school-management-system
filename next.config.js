const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: false,
    webpackMemoryOptimizations: false,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      http: false,
      https: false,
      stream: false,
      crypto: false,
      os: false,
      path: false,
      fs: false,
      net: false,
      tls: false,
      zlib: false,
      child_process: false,
      worker_threads: false,
      perf_hooks: false,
      diagnostics_channel: false,
      async_hooks: false,
      canvas: false,
      constants: false,
      dns: false,
      domain: false,
      punycode: false,
      readline: false,
      repl: false,
      vm: false,
      'util/types': false,
      buffer: false,
      querystring: false,
      url: false,
      timers: false,
      events: false,
      string_decoder: false,
    };
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = withPWA(nextConfig);
