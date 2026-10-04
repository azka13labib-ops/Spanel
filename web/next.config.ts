import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDev
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://localhost:8080/api/:path*",
            },
            {
              source: "/ws/:path*",
              destination: "http://localhost:8080/ws/:path*",
            },
          ];
        },
      }
    : {
        output: "export",
      }),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

