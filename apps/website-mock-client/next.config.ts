import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@techrecruit/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
