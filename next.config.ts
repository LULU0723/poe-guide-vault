import type { NextConfig } from "next";

// Static export for GitHub Pages. The project site is served from
// https://<user>.github.io/poe-guide-vault/, so assets need the repo basePath.
// Set PAGES_BASE_PATH="" for a user/apex domain or local `serve out` testing.
const basePath = process.env.PAGES_BASE_PATH ?? "/poe-guide-vault";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
