<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Deploys

Pushing to git deploys the app (Convex backend and Cloudflare frontend). Don't run `convex deploy` or `wrangler deploy` by hand.

## Payments

Payments use Square hosted payment links (`convex/square.ts`, webhook at `/square` in `convex/http.ts`). Square env vars: `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`. Set `SQUARE_ENV=sandbox` on dev only; production is the default.
