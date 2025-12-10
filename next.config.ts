import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["localhost"],
    dangerouslyAllowSVG: true,
  },
  security: {
    dangerouslyAllowHTML: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'porto': false,
      '@base-org/account': false,
      '@metamask/sdk': false
    };
    return config;
  }
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
