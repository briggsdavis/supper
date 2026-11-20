import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const vKind = v.union(v.literal("movie"), v.literal("show"))
export const vCourse = v.object({ course: v.string(), dish: v.string() })
export const vOrderStatus = v.union(v.literal("pending"), v.literal("paid"), v.literal("expired"))

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    alerts: v.optional(v.boolean()),
  }).index("by_alerts", ["alerts"]),

  titles: defineTable({
    slug: v.string(),
    name: v.string(),
    kind: vKind,
    year: v.optional(v.number()),
    synopsis: v.string(),
    posterId: v.optional(v.id("_storage")),
  })
    .index("by_slug", ["slug"])
    .searchIndex("search_name", { searchField: "name" }),

  recipes: defineTable({
    titleId: v.id("titles"),
    slug: v.string(),
    name: v.string(),
    summary: v.string(),
    videoUrl: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    ingredients: v.array(v.string()),
    steps: v.array(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_titleId", ["titleId"]),

  events: defineTable({
    slug: v.string(),
    titleId: v.id("titles"),
    startsAt: v.number(),
    venue: v.string(),
    address: v.string(),
    priceCents: v.number(),
    capacity: v.number(),
    sold: v.number(),
    menu: v.array(vCourse),
    note: v.optional(v.string()),
    published: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_titleId", ["titleId"])
    .index("by_startsAt", ["startsAt"])
    .index("by_published_and_startsAt", ["published", "startsAt"]),

  orders: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    quantity: v.number(),
    amountCents: v.number(),
    status: vOrderStatus,
    sessionId: v.optional(v.string()),
    checkedIn: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_eventId", ["eventId"])
    .index("by_sessionId", ["sessionId"]),

  comments: defineTable({
    userId: v.id("users"),
    titleId: v.optional(v.id("titles")),
    eventId: v.optional(v.id("events")),
    body: v.string(),
  })
    .index("by_titleId", ["titleId"])
    .index("by_eventId", ["eventId"]),
})
