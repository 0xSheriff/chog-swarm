/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pulled in by wagmi's Base Account connector; its x402 helpers lazily import
  // optional peer deps (@x402/*) that we don't install, so load it via Node at runtime.
  serverExternalPackages: ['@coinbase/cdp-sdk'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ]
  }
};

export default nextConfig;
