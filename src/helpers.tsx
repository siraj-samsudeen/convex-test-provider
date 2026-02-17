import { test as baseTest } from "vitest";
import { convexTest } from "convex-test";
import { ConvexTestProvider, type ConvexTestClient } from "./ConvexTestProvider.js";
import { ConvexTestAuthProvider } from "./ConvexTestAuthProvider.js";
import { render } from "@testing-library/react";
import type { ReactNode, ReactElement } from "react";

interface CreateConvexTestOptions {
  usersTable?: string;
}

interface ConvexTestFixtures {
  testClient: any;
  userId: string;
  client: any;
  seed: (table: string, data: Record<string, unknown>) => Promise<string>;
  createUser: () => Promise<any>;
}

const dbInsert = (client: any, table: string, data: Record<string, unknown>) =>
  client.run((ctx: any) => ctx.db.insert(table, data));

export function createConvexTest(
  schema: any,
  modules: any,
  options: CreateConvexTestOptions = {}
) {
  const usersTable = options.usersTable ?? "users";

  return baseTest.extend<ConvexTestFixtures>({
    testClient: async ({}, use) => {
      const client = convexTest(schema, modules);
      await use(client);
    },

    userId: async ({ testClient }, use) => {
      const id = await dbInsert(testClient, usersTable, {});
      await use(id);
    },

    client: async ({ testClient, userId }, use) => {
      const authenticated = testClient.withIdentity({ subject: userId });
      await use(authenticated);
    },

    seed: async ({ testClient, userId }, use) => {
      const seedFn = (table: string, data: Record<string, unknown>) =>
        dbInsert(testClient, table, { ...data, userId });
      await use(seedFn);
    },

    createUser: async ({ testClient }, use) => {
      const createUserFn = async () => {
        const newUserId = await dbInsert(testClient, usersTable, {});
        return testClient.withIdentity({ subject: newUserId });
      };
      await use(createUserFn);
    },
  });
}

export function wrapWithConvex(children: ReactNode, client: ConvexTestClient) {
  return <ConvexTestProvider client={client}>{children}</ConvexTestProvider>;
}

export function renderWithConvex(ui: ReactElement, client: ConvexTestClient) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => wrapWithConvex(children, client),
  });
}

export function renderWithConvexAuth(
  ui: ReactElement,
  client: ConvexTestClient,
  options?: { authenticated?: boolean; signInError?: Error }
) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ConvexTestAuthProvider
        client={client}
        authenticated={options?.authenticated ?? true}
        signInError={options?.signInError}
      >
        {children}
      </ConvexTestAuthProvider>
    ),
  });
}
