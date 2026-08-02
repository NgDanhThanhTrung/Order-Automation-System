---
name: Telegraf AbortSignal fix
description: How to fix Telegraf@4 + node-fetch@2 + Node.js 18+ AbortSignal crash in an esbuild bundle.
---

## The rule
When using Telegraf v4 (long polling) with esbuild bundling on Node.js 18+, you MUST add `"abort-controller"` to the esbuild `external` array in `build.mjs`.

**Why:** esbuild inlines (bundles) `abort-controller` into the output by default, creating a separate class instance from the one node-fetch loads from disk. Telegraf creates an `AbortController` from `globalThis.AbortController` (Node 18 native), which produces a native `AbortSignal`. node-fetch@2 checks `signal instanceof AbortSignal` using its own bundled copy — a different class → `TypeError: Expected signal to be an instanceof AbortSignal`.

**How to apply:** In `build.mjs`, add `"abort-controller"` to the `external` array. Also patch `globalThis.AbortController` at the top of `telegramBot.ts` (before Telegraf imports) so Telegraf uses the polyfill instance whose signal passes the node-fetch check:

```ts
import { AbortController as PolyfillAbortController } from "abort-controller";
(globalThis as any).AbortController = PolyfillAbortController;
```

With `abort-controller` externalized, both the bundle and node-fetch load it from the same path → Node.js module cache deduplication → same class instance → `instanceof` passes.
