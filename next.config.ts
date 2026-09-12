import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /bookmarklet reads extension/extractor.js off disk at request time
  // (buildBookmarkletHref) so the bookmarklet always matches the extractor
  // logic. Next's serverless file tracing doesn't detect that dynamic
  // fs.readFileSync as a dependency on its own, so without this the file
  // is missing in the deployed function and the route 500s in production
  // (worked in local dev only because the whole repo is on disk there).
  outputFileTracingIncludes: {
    "/bookmarklet": ["./extension/extractor.js"],
  },
};

export default nextConfig;
