/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
    webpack: (config, { dev, isServer }) => {
      if (dev) {
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
          ignored: ["**/node_modules/**", "**/.next/**"],
        };
      }
      return config;
    },
};

export default nextConfig;
