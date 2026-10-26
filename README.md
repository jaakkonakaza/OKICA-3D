# OKICA 3D

A 3D visualizer for an OKICA transport card’s balance and points.

`/demo` shows the card with sample data.

Run locally with `bun install` and `bun run dev`. Copy `.env.example` to `.env` to configure accounts and an optional development user. `/healthz` is public.

Production must sit behind the authentication proxy, which must replace the `Remote-User` header and prevent direct access to the app. That header selects the account in `OKICA_ACCOUNTS`, it is not independently verified by the app. `DEV_USER` is only used by the development server.

Run `bun run lint`, `bun run check`, `bun run test`, and `bun run test:e2e` before releasing. The browser tests build and start the production server.

The build uses `threlte-minify` to replace dynamic Three.js lookups with direct imports. Use built-in `<T.*>` components or `<T is={...}>`; the plugin does not support Threlte's `extend()` API.
