import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const exhibitBase = "/work/reserve/network-fund/site";

    return [
      {
        source: exhibitBase,
        destination: `${exhibitBase}/index.html`,
      },
      ...["fund", "analysts", "rebalances"].map((route) => ({
        source: `${exhibitBase}/${route}`,
        destination: `${exhibitBase}/${route}/index.html`,
      })),
      {
        source: `${exhibitBase}/analyst/:handle`,
        destination: `${exhibitBase}/analyst/:handle/index.html`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/work/saucelabs/live-testing",
        destination: "/work/saucelabs/software-testing",
        permanent: true,
      },
    ];
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
