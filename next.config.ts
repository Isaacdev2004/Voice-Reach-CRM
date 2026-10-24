import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/campaign-materials/*": ["./private/campaign-materials/*.pdf"],
    "/api/marketing/playbook": [
      "./resources/myari-agent-follow-up-playbook.pdf",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/stitch_voicereach_enterprise_crm/**",
        "**/.next/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
