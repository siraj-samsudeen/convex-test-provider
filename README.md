# convex-test-provider

React provider that adapts [convex-test](https://www.npmjs.com/package/convex-test)'s one-shot query/mutation client for use with Convex's `ConvexProvider`, so `useQuery` and `useMutation` work in tests against an in-memory backend.

## Install

```bash
npm i convex convex-test react
npm i -D convex-test-provider
```

## Usage

1. Create a convex-test client: `convexTest(schema, modules)`.
2. Wrap your component with `ConvexTestProvider` and pass the client:

```tsx
import { convexTest } from "convex-test";
import { ConvexTestProvider } from "convex-test-provider";
import schema from "./convex/schema";
import { modules } from "./convex/test.setup";

const testClient = convexTest(schema, modules);

render(
  <ConvexTestProvider client={testClient}>
    <YourComponent />
  </ConvexTestProvider>
);
```

## Query reactivity

This adapter runs each query **once** (when the component mounts). The UI does not re-render after a mutation in the same test. Assert backend state via `client.query(api.your.list, {})`, or re-mount to run the query again.

## Types

The `client` prop accepts any object with `query(ref, args)` and `mutation(ref, args)` returning promises. The result of `convexTest(schema, modules)` (and `.withIdentity(...)`) satisfies this.

## Versioning

Releases follow [semantic versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for release history.
