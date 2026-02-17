import { useCallback, useMemo, useRef, type ReactNode } from "react";
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
  // Two-level cache: query reference identity → serialized args → result.
  // Avoids collisions between different query functions whose proxies all
  // stringify to "{}" (see issue #2). Approach from PR #3.
  // useRef so cache survives re-renders (e.g. auth state toggle).
  const cache = useRef(new Map<unknown, Map<string, unknown>>());

  // Ref for authenticated so fakeClient.setAuth reads the latest value
  // without needing authenticated in the useMemo dependency array.
  const authenticatedRef = useRef(authenticated);
  authenticatedRef.current = authenticated;

  // Stable reference — only changes when the client prop itself changes.
  // ConvexProviderWithAuth puts client in useEffect deps; an unstable
  // reference would trigger setAuth/clearAuth cycles every render.
  const fakeClient = useMemo(() => ({
    watchQuery: (query: unknown, args: unknown) => {
      let queryCache = cache.current.get(query);
      if (!queryCache) {
        queryCache = new Map<string, unknown>();
        cache.current.set(query, queryCache);
      }
      const argsKey = JSON.stringify(args ?? {});
      let subscriber: (() => void) | null = null;

      client.query(query as never, args ?? {}).then((result) => {
        queryCache.set(argsKey, result);
        subscriber?.();
      });

      return {
        localQueryResult: () => queryCache.get(argsKey),
        onUpdate: (cb: () => void) => {
          subscriber = cb;
          return () => { subscriber = null; };
        },
      };
    },
    mutation: (mutation: unknown, args: unknown) => {
      return client.mutation(mutation as never, args ?? {});
    },
    // Synchronous — real client calls onChange async, but ConvexProviderWithAuth
    // calls setAuth inside useEffect (committed state), so sync is safe here.
    setAuth: (_fetchToken: unknown, onChange: (isAuth: boolean) => void) => {
      onChange(authenticatedRef.current ?? false);
    },
    clearAuth: () => {},
  }), [client]);

  // Stable fetchAccessToken — ConvexProviderWithAuth puts this in useEffect
  // deps. Unstable reference would trigger setAuth/clearAuth every render,
  // pausing/resuming websockets. Matches Convex's own Auth0 provider pattern.
  const fetchAccessToken = useCallback(async () => null, []);

  // Only changes when authenticated changes — which is when we actually
  // want ConvexProviderWithAuth to re-run its auth effects.
  const useAuth = useCallback(() => ({
    isLoading: false,
    isAuthenticated: authenticated ?? false,
    fetchAccessToken,
  }), [authenticated, fetchAccessToken]);

  if (authenticated === undefined) {
    return (
      <ConvexProvider client={fakeClient as never}>
        {children}
      </ConvexProvider>
    );
  }

  return (
    <ConvexProviderWithAuth client={fakeClient as never} useAuth={useAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
