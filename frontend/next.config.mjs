/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backend = process.env.HELMSMAN_API_URL || "http://localhost:8000"
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/:path*`,
      },
    ]
  },
}

export default nextConfig
