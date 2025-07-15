import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Add the following lines to enable static export for GitHub Pages
  output: 'export',
  // Replace 'your-repo-name' with the name of your GitHub repository
  basePath: process.env.NODE_ENV === 'production' ? '/your-repo-name' : '', 
  assetPrefix: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '',

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
