import { createRequire } from "node:module";
import { resolve } from "node:path";

/**
 * Vite plugin that resolves the internal @convex-dev/auth import used by
 * ConvexTestAuthProvider. Add this to your vitest.config.ts plugins array
 * so you don't need a manual resolve.alias entry.
 *
 * Background: ConvexTestAuthProvider imports ConvexAuthActionsContext from
 * @convex-dev/auth/dist/react/client.js — an internal path not in the
 * package's exports field. Vite enforces exports strictly and blocks it.
 * This plugin adds a resolve.alias so Vite can find the file.
 *
 * Upstream fix requested: https://github.com/get-convex/convex-auth/issues/281
 *
 * @example
 * ```ts
 * import { convexTestProviderPlugin } from "feather-testing-convex/vitest-plugin";
 *
 * export default defineConfig({
 *   plugins: [convexTestProviderPlugin()],
 * });
 * ```
 */
export function convexTestProviderPlugin() {
  // require.resolve("@convex-dev/auth/dist/react/client.js") throws
  // ERR_PACKAGE_PATH_NOT_EXPORTED because the path isn't in exports.
  // Resolve from the consumer's project root (not from this plugin's
  // location) so the alias points to the same copy that useAuthActions()
  // uses — avoiding React Context duplication.
  const require = createRequire(resolve(process.cwd(), "package.json"));
  const mainEntry = require.resolve("@convex-dev/auth/react");
  const pkgName = "@convex-dev/auth";
  const authRoot = mainEntry.slice(
    0,
    mainEntry.indexOf(pkgName) + pkgName.length,
  );
  const resolved = resolve(authRoot, "dist/react/client.js");

  return {
    name: "feather-testing-convex",
    config() {
      return {
        resolve: {
          alias: {
            "@convex-dev/auth/dist/react/client.js": resolved,
          },
        },
      };
    },
  };
}
