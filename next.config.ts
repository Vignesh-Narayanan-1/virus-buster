import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Add the following lines to enable static export for GitHub Pages
  output: 'export',
  // Replace 'virus-buster' with the name of your new GitHub repository if it's different
  basePath: process.env.NODE_ENV === 'production' ? '/virus-buster' : '', 
  assetPrefix: process.env.NODE_ENV === 'production' ? '/virus-buster/' : '',

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
    ],
    // Un-optimize images for static export
    unoptimized: true,
  },
};

export default nextConfig;
