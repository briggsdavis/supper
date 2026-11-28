import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, query, type MutationCtx } from "./_generated/server"
import { sendEmail, SITE_URL } from "./email"
import { emailOf, requireUser } from "./lib"
import { withPoster } from "./titles"
import { hasFullName } from "./users"

export const HOLD_MS = 33 * 60 * 1000
export const MAX_SEATS = 10

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50)
    return await Promise.all(
      orders
        .filter((o) => o.status === "paid")
        .map(async (o) => {
          const event = await ctx.db.get("events", o.eventId)
          const title = event && (await ctx.db.get("titles", event.titleId))
          return { ...o, event, title: title && (await withPoster(ctx, title)) }
        }),
    )
  },
})

export const byRef = query({
  args: { ref: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    const orderId = ctx.db.normalizeId("orders", args.ref)
    const order = orderId && (await ctx.db.get("orders", orderId))
    if (!order || order.userId !== userId) return null
    const event = await ctx.db.get("events", order.eventId)
    const title = event && (await ctx.db.get("titles", event.titleId))
    return { ...order, event, title }
  },
})

export const squareOrderIdFor = internalQuery({
  args: { ref: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const orderId = ctx.db.normalizeId("orders", args.ref)
    const order = orderId && (await ctx.db.get("orders", orderId))
    if (!order || order.status === "paid") return null
    return order.squareOrderId ?? null
  },
})

export const reserve = internalMutation({
  args: { eventId: v.id("events"), quantity: v.number() },
  returns: v.object({
    orderId: v.id("orders"),
    slug: v.string(),
    unitCents: v.number(),
    name: v.string(),
    email: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    if (!hasFullName(await ctx.db.get("users", userId)))
      throw new ConvexError("Add your first and last name before buying tickets.")
    const event = await ctx.db.get("events", args.eventId)
    if (event === null || !event.published) throw new ConvexError("This dinner isn't on sale.")
    if (event.startsAt < Date.now()) throw new ConvexError("This dinner already happened.")
    if (!Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > MAX_SEATS) {
      throw new ConvexError(`Pick 1 to ${MAX_SEATS} seats.`)
    }
    const left = event.capacity - event.sold
    if (args.quantity > left)
      throw new ConvexError(left > 0 ? `Only ${left} seats left.` : "Sold out.")
    const title = await ctx.db.get("titles", event.titleId)
    await ctx.db.patch("events", event._id, { sold: event.sold + args.quantity })
    const orderId = await ctx.db.insert("orders", {
      userId,
      eventId: event._id,
      quantity: args.quantity,
      amountCents: event.priceCents * args.quantity,
      status: "pending",
      checkedIn: false,
    })
    await ctx.scheduler.runAfter(HOLD_MS, internal.orders.release, { orderId })
    return {
      orderId,
      slug: event.slug,
      unitCents: event.priceCents,
      name: `${title?.name ?? "Dinner"}: ${new Date(event.startsAt).toDateString()}`,
      email: await emailOf(ctx, userId),
    }
  },
})

export const attachPayment = internalMutation({
  args: { orderId: v.id("orders"), squareOrderId: v.string(), paymentLinkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, ...fields }) => {
    await ctx.db.patch("orders", orderId, fields)
    return null
  },
})

export const release = internalMutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId)
    if (order === null || order.status !== "pending") return null
    await ctx.db.patch("orders", order._id, { status: "expired" })
    const event = await ctx.db.get("events", order.eventId)
    if (event)
      await ctx.db.patch("events", event._id, { sold: Math.max(0, event.sold - order.quantity) })
    if (order.paymentLinkId)
      await ctx.scheduler.runAfter(0, internal.square.deactivate, {
        paymentLinkId: order.paymentLinkId,
      })
    return null
  },
})

export const markPaid = internalMutation({
  args: { squareOrderId: v.string(), paymentId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_squareOrderId", (q) => q.eq("squareOrderId", args.squareOrderId))
      .unique()
    if (order === null || order.status === "paid") return null
    const event = await ctx.db.get("events", order.eventId)
    if (event === null) return null
    if (order.status === "expired")
      await ctx.db.patch("events", event._id, { sold: event.sold + order.quantity })
    await ctx.db.patch("orders", order._id, { status: "paid", paymentId: args.paymentId })
    await confirmationEmail(ctx, order._id)
    return null
  },
})

async function confirmationEmail(ctx: MutationCtx, orderId: Id<"orders">) {
  const order = await ctx.db.get("orders", orderId)
  if (order === null) return
  const event = await ctx.db.get("events", order.eventId)
  const title = event && (await ctx.db.get("titles", event.titleId))
  const email = await emailOf(ctx, order.userId)
  if (!event || !email) return
  const when = new Date(event.startsAt).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/New_York",
  })
  const seats = order.quantity === 1 ? "1 seat" : `${order.quantity} seats`
  await sendEmail(
    ctx,
    email,
    `You're in: ${title?.name ?? "Scenes and Supper"}`,
    [
      `You have ${seats} for ${title?.name ?? "our next dinner"}.`,
      "",
      `When: ${when}`,
      `Where: ${event.address}`,
      "",
      `Details: ${SITE_URL}/dinners/${event.slug}`,
      `Your tickets: ${SITE_URL}/account`,
      "",
      "See you at the table.",
    ].join("\n"),
    `order-${order._id}`,
  )
}
