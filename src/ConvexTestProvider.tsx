import type { ReactNode } from "react";
import { ConvexProvider } from "convex/react";

/** Minimal client shape: one-shot query and mutation. Matches convex-test client. */
export interface ConvexTestClient {
  query: (query: unknown, args: unknown) => Promise<unknown>;
  mutation: (mutation: unknown, args: unknown) => Promise<unknown>;
}

/**
 * Wraps children in ConvexProvider with a fake client that adapts convex-test's
 * one-shot query/mutation API to the reactive watchQuery API the real ConvexProvider expects.
 * Lets useQuery/useMutation run in tests against an in-memory backend.
 */
export function ConvexTestProvider({
  client,
  children,
}: {
  client: ConvexTestClient;
  children: ReactNode;
}) {
  // Cache query results by query function identity and argument key.
  // This avoids collisions between different query functions that would
  // otherwise stringify to the same JSON representation.
  const cache = new Map<unknown, Map<string, unknown>>();

  const fakeClient = {
    watchQuery: (query: unknown, args: unknown) => {
      let queryCache = cache.get(query);
      if (!queryCache) {
        queryCache = new Map<string, unknown>();
        cache.set(query, queryCache);
      }

      const argsKey = JSON.stringify(args ?? {});
      let subscriber: (() => void) | null = null;

      client.query(query as never, args ?? {}).then((result) => {
        queryCache!.set(argsKey, result);
        subscriber?.();
      });

      return {
        localQueryResult: () => queryCache!.get(argsKey),
        onUpdate: (cb: () => void) => {
          subscriber = cb;
          return () => { subscriber = null; };
        },
      };
    },
    mutation: (mutation: unknown, args: unknown) => {
      return client.mutation(mutation as never, args ?? {});
    },
  };

  return (
    <ConvexProvider client={fakeClient as never}>
      {children}
    </ConvexProvider>
  );
}
