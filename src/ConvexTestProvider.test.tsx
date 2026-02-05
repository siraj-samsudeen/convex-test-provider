/**
 * Package tests: ConvexTestProvider with this package's minimal backend (items list/add).
 *
 * Query reactivity vs fake client:
 * In production, Convex pushes new query results after a mutation, so the list on screen
 * updates automatically. Our fake client only runs the query once (when the component
 * mounts), so in these tests the UI does not re-render with the new list after a mutation.
 * We assert the backend via client.query(api.items.list, {}). To have the list on screen
 * update in tests too, ConvexTestProvider would need to re-run active queries after
 * mutations and notify subscribers.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, useQuery } from "convex/react";
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "../convex/test.setup";
import { ConvexTestProvider } from "./ConvexTestProvider";

function QueryOnly() {
  const items = useQuery(api.items.list);
  if (items === undefined) return <div>Loading</div>;
  if (items.length === 0) return <div>No items yet</div>;
  return <div>{items.length} item(s)</div>;
}

function QueryList() {
  const items = useQuery(api.items.list);
  if (items === undefined) return <div>Loading</div>;
  if (items.length === 0) return <div>No items yet</div>;
  return (
    <ul>
      {items.map((item) => (
        <li key={item._id}>{item.text}</li>
      ))}
    </ul>
  );
}

function AddButton() {
  const add = useMutation(api.items.add);
  return (
    <button type="button" onClick={() => add({ text: "From test" })}>
      Add
    </button>
  );
}

describe("ConvexTestProvider", () => {
  it("useQuery receives result after one-shot query resolves", async () => {
    // Fake client: watchQuery runs client.query once, caches result, notifies subscriber.
    // We assert the UI shows the cached result (empty list → "No items yet").
    const client = convexTest(schema, modules);

    render(
      <ConvexTestProvider client={client}>
        <QueryOnly />
      </ConvexTestProvider>,
    );

    expect(await screen.findByText("No items yet")).toBeInTheDocument();
  });

  it("useMutation updates the backend", async () => {
    // Fake client: mutation() forwards to client.mutation. UI does not re-run the query,
    // so we assert backend state via client.query(api.items.list, {}) after the click.
    const client = convexTest(schema, modules);
    const user = userEvent.setup();

    render(
      <ConvexTestProvider client={client}>
        <AddButton />
      </ConvexTestProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(async () => {
      const items = await client.query(api.items.list, {});
      expect(items).toHaveLength(1);
      expect(items[0].text).toBe("From test");
    });
  });

  it("unmount and remount still works", async () => {
    // Fake client: unmount clears the subscriber (onUpdate callback); remount runs
    // watchQuery again and gets fresh data from the same backend. Same client, new session.
    const client = convexTest(schema, modules);
    await client.mutation(api.items.add, { text: "A" });
    await client.mutation(api.items.add, { text: "B" });

    const { rerender } = render(
      <ConvexTestProvider client={client}>
        <QueryList />
      </ConvexTestProvider>,
    );

    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();

    rerender(
      <ConvexTestProvider client={client}>
        {null}
      </ConvexTestProvider>,
    );

    rerender(
      <ConvexTestProvider client={client}>
        <QueryList />
      </ConvexTestProvider>,
    );

    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
