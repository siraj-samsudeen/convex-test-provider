import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @convex-dev/auth doesn't export this path publicly; alias lets Vite resolve it.
      "@convex-dev/auth/dist/react/client.js": path.resolve(
        __dirname,
        "node_modules/@convex-dev/auth/dist/react/client.js",
      ),
    },
  },
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["convex/**", "edge-runtime"]],
    server: { deps: { inline: ["convex-test"] } },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
