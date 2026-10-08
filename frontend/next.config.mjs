/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * Emits a self-contained server bundle in `.next/standalone`, containing only
   * the modules actually imported. Required by the Dockerfile's runtime stage —
   * without it the runtime image would need the full node_modules tree.
   *
   * Netlify does not use this output; it deploys from source. It is harmless
   * there and required for the container path, so both work.
   */
  output: "standalone",

  /*
   * `cacheComponents` and `partialPrefetching` are off, though
   * create-next-app enables both by default.
   *
   * They only pay off when a page can be prerendered and streamed — but every
   * route in this app is auth-gated: the shell layout reads `cookies()` to
   * decide whether to redirect, the landing page reads it to pick a
   * destination, and both lead pages fetch a per-user ranking. Under Cache
   * Components each of those reads must sit inside a `<Suspense>` boundary or
   * the build refuses to prerender at all:
   *
   *   "Route '/leads': Next.js encountered uncached or runtime data during
   *    prerendering."
   *
   * Wrapping every cookie read to satisfy a flag that would then cache nothing
   * is not a trade worth making. With it off, `cookies()` and a
   * `cache: "no-store"` fetch opt each route into per-request rendering, which
   * is exactly what a user-specific ranking needs — caching one would show a
   * user another's leads.
   */
  cacheComponents: false,
  partialPrefetching: false,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;