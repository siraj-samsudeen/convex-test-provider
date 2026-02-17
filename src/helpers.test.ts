import { describe, expect } from "vitest";
import { createConvexTest } from "./index.js";
import schema from "../convex/schema.js";
import { modules } from "../convex/test.setup.js";
import { api } from "../convex/_generated/api.js";

const test = createConvexTest(schema, modules);

describe("createConvexTest fixtures", () => {
  test("client fixture is authenticated", async ({ client, userId }) => {
    expect(userId).toBeDefined();
    expect(typeof userId).toBe("string");
  });

  test("seed auto-fills userId", async ({ client, seed }) => {
    const todoId = await seed("todos", { text: "Test", completed: false });
    expect(todoId).toBeDefined();

    const todos = await client.query(api.todos.list, {});
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe("Test");
  });

  test("createUser returns new authenticated client", async ({ client, createUser }) => {
    await client.mutation(api.todos.create, { text: "Alice's" });

    const bob = await createUser();
    const bobTodos = await bob.query(api.todos.list, {});
    expect(bobTodos).toHaveLength(0);
  });

  test("testClient is unauthenticated", async ({ testClient }) => {
    const todos = await testClient.query(api.todos.list, {});
    expect(todos).toHaveLength(0);
  });

  test("seed respects explicit userId", async ({ testClient, seed, userId }) => {
    const otherUserId = await testClient.run((ctx: any) =>
      ctx.db.insert("users", {})
    );
    await seed("todos", { text: "Other's todo", completed: false, userId: otherUserId });

    // Verify the record has the explicit userId, not the default
    const allTodos = await testClient.run((ctx: any) => ctx.db.query("todos").collect());
    expect(allTodos).toHaveLength(1);
    expect(allTodos[0].userId).toBe(otherUserId);
    expect(allTodos[0].userId).not.toBe(userId);
  });

  test("createUser exposes userId", async ({ createUser }) => {
    const bob = await createUser();
    expect(bob.userId).toBeDefined();
    expect(typeof bob.userId).toBe("string");
  });

  test("multi-user data isolation", async ({ client, seed, createUser }) => {
    const bob = await createUser();

    // Seed a todo for bob
    await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });

    // Default user (client) should not see bob's todo
    const myTodos = await client.query(api.todos.list, {});
    expect(myTodos).toHaveLength(0);

    // Bob should see his own todo
    const bobTodos = await bob.query(api.todos.list, {});
    expect(bobTodos).toHaveLength(1);
    expect(bobTodos[0].text).toBe("Bob's todo");
  });
});
