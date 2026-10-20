/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Redirect responses set their own no-store headers in the route
        // handler (see app/r/[slug]/route.ts) to avoid duplicate headers.
        source: "/r/:slug*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};
export default nextConfig;
