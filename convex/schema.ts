import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const vKind = v.union(v.literal("movie"), v.literal("show"))
export const vCourse = v.object({ course: v.string(), dish: v.string() })
export const vOrderStatus = v.union(v.literal("pending"), v.literal("paid"), v.literal("expired"))
export const vPopupLayout = v.union(
  v.literal("left"),
  v.literal("right"),
  v.literal("top"),
  v.literal("none"),
)
export const vAnnouncementFields = {
  text: v.string(),
  color: v.string(),
  link: v.optional(v.string()),
  active: v.boolean(),
}
export const vPopupFields = {
  title: v.string(),
  text: v.string(),
  backgroundColor: v.string(),
  textColor: v.string(),
  layout: vPopupLayout,
  captureEmail: v.boolean(),
  button: v.optional(v.object({ text: v.string(), color: v.string(), link: v.string() })),
  active: v.boolean(),
}

export default defineSchema({
  announcementBars: defineTable(vAnnouncementFields).index("by_active", ["active"]),
  popups: defineTable({
    ...vPopupFields,
    imageId: v.optional(v.id("_storage")),
  }).index("by_active", ["active"]),
  popupSignups: defineTable({
    popupId: v.id("popups"),
    popupTitle: v.string(),
    email: v.string(),
  }).index("by_popupId_and_email", ["popupId", "email"]),

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
    course: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
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
    venue: v.optional(v.string()),
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
    squareOrderId: v.optional(v.string()),
    paymentLinkId: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    checkedIn: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_eventId", ["eventId"])
    .index("by_squareOrderId", ["squareOrderId"]),

  suggestions: defineTable({
    userId: v.id("users"),
    movie: v.string(),
    food: v.string(),
  }),
})
