/**
 * Tests for ConvexTestAuthProvider and renderWithConvexAuth.
 *
 * Verifies that components using Convex auth hooks (<Authenticated>, <Unauthenticated>,
 * useConvexAuth(), useAuthActions()) work correctly when wrapped with our test providers.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
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

function AuthGateWithActions() {
  const { signIn, signOut } = useAuthActions();
  return (
    <div>
      <Authenticated>
        <div>Welcome back</div>
        <button type="button" onClick={() => signOut()}>
          Sign Out
        </button>
      </Authenticated>
      <Unauthenticated>
        <div>Please sign in</div>
        <button type="button" onClick={() => signIn("password")}>
          Sign In
        </button>
      </Unauthenticated>
    </div>
  );
}

function SignInWithError() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => void signIn("password").catch((e: Error) => setError(e.message))}
      >
        Try Sign In
      </button>
      {error && <div>Error: {error}</div>}
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

  it("signOut toggles view from authenticated to unauthenticated", async () => {
    const client = convexTest(schema, modules);
    const user = userEvent.setup();
    renderWithConvexAuth(<AuthGateWithActions />, client);

    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByText("Please sign in")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(await screen.findByText("Please sign in")).toBeInTheDocument();
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });

  it("signIn toggles view from unauthenticated to authenticated", async () => {
    const client = convexTest(schema, modules);
    const user = userEvent.setup();
    renderWithConvexAuth(<AuthGateWithActions />, client, { authenticated: false });

    expect(await screen.findByText("Please sign in")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByText("Please sign in")).not.toBeInTheDocument();
  });

  it("signInError makes signIn reject and surfaces error", async () => {
    const client = convexTest(schema, modules);
    const user = userEvent.setup();
    renderWithConvexAuth(<SignInWithError />, client, {
      authenticated: false,
      signInError: new Error("Invalid credentials"),
    });

    await user.click(screen.getByRole("button", { name: "Try Sign In" }));

    expect(await screen.findByText("Error: Invalid credentials")).toBeInTheDocument();
  });
});
