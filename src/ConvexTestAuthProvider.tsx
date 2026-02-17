// TODO: Replace with public export when @convex-dev/auth provides one.
// Track: https://github.com/get-convex/convex-auth — request exported TestAuthProvider or context.
// @ts-expect-error — internal path not in package exports; works at runtime via bundler
import { ConvexAuthActionsContext } from "@convex-dev/auth/dist/react/client.js";
import { useState, type ReactNode } from "react";

import { ConvexTestProvider, type ConvexTestClient } from "./ConvexTestProvider.js";

/**
 * Wraps children with both auth state (ConvexProviderWithAuth) and auth actions
 * (ConvexAuthActionsContext), so components using <Authenticated>, <Unauthenticated>,
 * useConvexAuth(), and useAuthActions() all work in tests.
 *
 * Like Phoenix's log_in_user(conn, user) — signIn/signOut toggle real auth state.
 * signIn sets authenticated=true, signOut sets authenticated=false.
 * Pass signInError to simulate sign-in failures (triggers .catch() in consuming code).
 */
export function ConvexTestAuthProvider({
  client,
  children,
  authenticated = true,
  signInError,
}: {
  client: ConvexTestClient;
  children: ReactNode;
  authenticated?: boolean;
  signInError?: Error;
}) {
  const [isAuth, setIsAuth] = useState(authenticated);

  const actions = {
    signIn: async () => {
      if (signInError) throw signInError;
      setIsAuth(true);
      return { signingIn: false as const };
    },
    signOut: async () => {
      setIsAuth(false);
    },
  };

  return (
    <ConvexTestProvider client={client} authenticated={isAuth}>
      <ConvexAuthActionsContext.Provider value={actions}>
        {children}
      </ConvexAuthActionsContext.Provider>
    </ConvexTestProvider>
  );
}
