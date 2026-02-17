import type { ReactNode } from "react";
import { ConvexProvider, ConvexProviderWithAuth } from "convex/react";

/** Minimal client shape: one-shot query and mutation. Matches convex-test client. */
export interface ConvexTestClient {
  query: (query: unknown, args: unknown) => Promise<unknown>;
  mutation: (mutation: unknown, args: unknown) => Promise<unknown>;
}

/**
 * Wraps children in ConvexProvider with a fake client that adapts convex-test's
 * one-shot query/mutation API to the reactive watchQuery API the real ConvexProvider expects.
 * Lets useQuery/useMutation run in tests against an in-memory backend.
 *
 * When `authenticated` is provided, uses ConvexProviderWithAuth instead of ConvexProvider,
 * enabling <Authenticated>, <Unauthenticated>, and useConvexAuth() in tested components.
 */
export function ConvexTestProvider({
  client,
  children,
  authenticated,
}: {
  client: ConvexTestClient;
  children: ReactNode;
  authenticated?: boolean;
}) {
  const cache = new Map<string, unknown>();

  const fakeClient = {
    watchQuery: (query: unknown, args: unknown) => {
      const key = JSON.stringify({ query, args });
      let subscriber: (() => void) | null = null;

      client.query(query as never, args ?? {}).then((result) => {
        cache.set(key, result);
        subscriber?.();
      });

      return {
        localQueryResult: () => cache.get(key),
        onUpdate: (cb: () => void) => {
          subscriber = cb;
          return () => { subscriber = null; };
        },
      };
    },
    mutation: (mutation: unknown, args: unknown) => {
      return client.mutation(mutation as never, args ?? {});
    },
    // Stubs for ConvexProviderWithAuth — immediately report auth state
    setAuth: (_fetchToken: unknown, onChange: (isAuth: boolean) => void) => {
      onChange(authenticated ?? false);
    },
    clearAuth: () => {},
  };

  if (authenticated === undefined) {
    return (
      <ConvexProvider client={fakeClient as never}>
        {children}
      </ConvexProvider>
    );
  }

  const useAuth = () => ({
    isLoading: false,
    isAuthenticated: authenticated,
    fetchAccessToken: async () => null,
  });

  return (
    <ConvexProviderWithAuth client={fakeClient as never} useAuth={useAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
