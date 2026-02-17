// TODO: Replace with public export when @convex-dev/auth provides one.
// Track: https://github.com/get-convex/convex-auth — request exported TestAuthProvider or context.
// @ts-expect-error — internal path not in package exports; works at runtime via bundler
import { ConvexAuthActionsContext } from "@convex-dev/auth/dist/react/client.js";
import type { ReactNode } from "react";

import { ConvexTestProvider, type ConvexTestClient } from "./ConvexTestProvider.js";

/**
 * Wraps children with both auth state (ConvexProviderWithAuth) and auth actions
 * (ConvexAuthActionsContext), so components using <Authenticated>, <Unauthenticated>,
 * useConvexAuth(), and useAuthActions() all work in tests.
 *
 * Inspired by Phoenix's log_in_user(conn, user) — sets auth state, skips the ceremony.
 * The signIn/signOut actions are no-ops; test the auth ceremony with Playwright e2e instead.
 */
export function ConvexTestAuthProvider({
  client,
  children,
  authenticated = true,
}: {
  client: ConvexTestClient;
  children: ReactNode;
  authenticated?: boolean;
}) {
  const actions = {
    signIn: async () => ({ signingIn: false as const }),
    signOut: async () => {},
  };

  return (
    <ConvexTestProvider client={client} authenticated={authenticated}>
      <ConvexAuthActionsContext.Provider value={actions}>
        {children}
      </ConvexAuthActionsContext.Provider>
    </ConvexTestProvider>
  );
}
