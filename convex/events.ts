import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { emailOf, isAdmin, requireAdmin, uniqueSlug } from "./lib"
import { vCourse } from "./schema"
import { withPoster } from "./titles"

async function withTitle(ctx: QueryCtx, event: Doc<"events">) {
  const title = await ctx.db.get("titles", event.titleId)
  return { ...event, title: title && (await withPoster(ctx, title)) }
}

export const upcoming = query({
  args: { after: v.number() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_published_and_startsAt", (q) =>
        q.eq("published", true).gte("startsAt", args.after),
      )
      .take(50)
    return await Promise.all(events.map((e) => withTitle(ctx, e)))
  },
})

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (event === null) return null
    if (!event.published) {
      const userId = await getAuthUserId(ctx)
      if (userId === null || !(await isAdmin(ctx, userId))) return null
    }
    return await withTitle(ctx, event)
  },
})

export const all = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const events = await ctx.db.query("events").withIndex("by_startsAt").order("desc").take(100)
    return await Promise.all(
      events.map(async (e) => ({ ...e, title: await ctx.db.get("titles", e.titleId) })),
    )
  },
})

export const byId = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await ctx.db.get("events", args.id)
  },
})

export const save = mutation({
  args: {
    id: v.optional(v.id("events")),
    titleId: v.id("titles"),
    startsAt: v.number(),
    address: v.string(),
    priceCents: v.number(),
    capacity: v.number(),
    menu: v.array(vCourse),
    note: v.optional(v.string()),
    published: v.boolean(),
  },
  returns: v.id("events"),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx)
    const title = await ctx.db.get("titles", fields.titleId)
    if (title === null) throw new ConvexError("Pick a title.")
    if (!Number.isInteger(fields.priceCents) || fields.priceCents < 50)
      throw new ConvexError("Price must be at least $0.50.")
    if (!Number.isInteger(fields.capacity) || fields.capacity < 1)
      throw new ConvexError("Seats must be at least 1.")
    const old = id === undefined ? null : await ctx.db.get("events", id)
    if (id !== undefined && old === null) throw new ConvexError("Dinner not found.")
    const sold = old?.sold ?? 0
    if (fields.capacity < sold) throw new ConvexError(`${sold} seats are already sold.`)
    const date = new Date(fields.startsAt).toISOString().slice(0, 10)
    const slug = await uniqueSlug(
      (s) =>
        ctx.db
          .query("events")
          .withIndex("by_slug", (q) => q.eq("slug", s))
          .unique(),
      `${title.name} ${date}`,
      id,
    )
    const doc = {
      ...fields,
      slug,
      sold,
      address: fields.address.trim(),
      note: fields.note?.trim() || undefined,
      menu: fields.menu.filter((c) => c.dish.trim()),
    }
    const eventId = id === undefined ? await ctx.db.insert("events", doc) : id
    if (old !== null) await ctx.db.replace("events", eventId, doc)
    if (doc.published && !old?.published && doc.startsAt > Date.now()) {
      await ctx.scheduler.runAfter(0, internal.alerts.send, { eventId, cursor: null })
    }
    return eventId
  },
})

export const remove = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const event = await ctx.db.get("events", args.id)
    if (event === null) return null
    if (event.sold > 0) throw new ConvexError("This dinner has sold seats. Unpublish it instead.")
    await ctx.db.delete("events", args.id)
    return null
  },
})

export const guests = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.id))
      .take(1000)
    return await Promise.all(
      orders
        .filter((o) => o.status === "paid")
        .map(async (o) => {
          const user = await ctx.db.get("users", o.userId)
          return { ...o, name: user?.name ?? "", email: await emailOf(ctx, o.userId) }
        }),
    )
  },
})

export const checkIn = mutation({
  args: { orderId: v.id("orders"), checkedIn: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    await ctx.db.patch("orders", args.orderId, { checkedIn: args.checkedIn })
    return null
  },
})
