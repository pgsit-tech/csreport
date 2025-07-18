import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // 禁用API路由，因为静态导出不支持
  // API功能将通过Cloudflare Worker实现
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // 排除worker目录
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
};

export default nextConfig;
