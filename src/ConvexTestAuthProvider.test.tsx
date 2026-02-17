/**
 * Tests for ConvexTestAuthProvider and renderWithConvexAuth.
 *
 * Verifies that components using Convex auth hooks (<Authenticated>, <Unauthenticated>,
 * useConvexAuth(), useAuthActions()) work correctly when wrapped with our test providers.
 */
import { screen } from "@testing-library/react";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";

import schema from "../convex/schema";
import { modules } from "../convex/test.setup";
import { renderWithConvexAuth } from "./helpers";

function AuthStatus() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <div>Loading auth...</div>;
  return <div>authenticated: {String(isAuthenticated)}</div>;
}

function AuthGate() {
  return (
    <div>
      <Authenticated>
        <div>Welcome back</div>
      </Authenticated>
      <Unauthenticated>
        <div>Please sign in</div>
      </Unauthenticated>
    </div>
  );
}

function AuthActionsConsumer() {
  const { signIn, signOut } = useAuthActions();
  return (
    <div>
      <div>Actions available</div>
      <button type="button" onClick={() => signIn("password")}>
        Sign In
      </button>
      <button type="button" onClick={() => signOut()}>
        Sign Out
      </button>
    </div>
  );
}

describe("ConvexTestAuthProvider", () => {
  it("useConvexAuth returns authenticated state by default", async () => {
    const client = convexTest(schema, modules);
    renderWithConvexAuth(<AuthStatus />, client);

    expect(
      await screen.findByText("authenticated: true"),
    ).toBeInTheDocument();
  });

  it("useConvexAuth returns unauthenticated when authenticated=false", async () => {
    const client = convexTest(schema, modules);
    renderWithConvexAuth(<AuthStatus />, client, { authenticated: false });

    expect(
      await screen.findByText("authenticated: false"),
    ).toBeInTheDocument();
  });

  it("<Authenticated> children visible when authenticated", async () => {
    const client = convexTest(schema, modules);
    renderWithConvexAuth(<AuthGate />, client);

    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByText("Please sign in")).not.toBeInTheDocument();
  });

  it("<Unauthenticated> children visible when not authenticated", async () => {
    const client = convexTest(schema, modules);
    renderWithConvexAuth(<AuthGate />, client, { authenticated: false });

    expect(await screen.findByText("Please sign in")).toBeInTheDocument();
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });

  it("useAuthActions does not throw", async () => {
    const client = convexTest(schema, modules);
    renderWithConvexAuth(<AuthActionsConsumer />, client);

    expect(
      await screen.findByText("Actions available"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign In" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign Out" }),
    ).toBeInTheDocument();
  });
});
