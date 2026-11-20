/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js"
import type * as auth from "../auth.js"
import type * as comments from "../comments.js"
import type * as email from "../email.js"
import type * as events from "../events.js"
import type * as http from "../http.js"
import type * as lib from "../lib.js"
import type * as orders from "../orders.js"
import type * as recipes from "../recipes.js"
import type * as seed from "../seed.js"
import type * as stripe from "../stripe.js"
import type * as titles from "../titles.js"
import type * as users from "../users.js"

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server"

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts
  auth: typeof auth
  comments: typeof comments
  email: typeof email
  events: typeof events
  http: typeof http
  lib: typeof lib
  orders: typeof orders
  recipes: typeof recipes
  seed: typeof seed
  stripe: typeof stripe
  titles: typeof titles
  users: typeof users
}>

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>

export declare const components: {
  auth: import("@convex-dev/auth/_generated/component.js").ComponentApi<"auth">
  authEmail: import("@convex-dev/auth/components/email/_generated/component.js").ComponentApi<"authEmail">
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">
}
