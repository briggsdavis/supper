import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"
import { sendEmail, SITE_URL } from "./email"
import { emailOf } from "./lib"

export const send = internalMutation({
  args: { eventId: v.id("events"), cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get("events", args.eventId)
    if (event === null || !event.published) return null
    const title = await ctx.db.get("titles", event.titleId)
    const name = title?.name ?? "a new dinner"
    const when = new Date(event.startsAt).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/New_York",
    })
    const page = await ctx.db
      .query("users")
      .withIndex("by_alerts", (q) => q.eq("alerts", true))
      .paginate({ numItems: 50, cursor: args.cursor })
    for (const user of page.page) {
      const email = await emailOf(ctx, user._id)
      if (!email) continue
      await sendEmail(
        ctx,
        email,
        `New dinner: ${name}`,
        [
          `We just opened seats for ${name}.`,
          "",
          `When: ${when}`,
          `Where: ${event.address}`,
          "",
          `Get tickets: ${SITE_URL}/dinners/${event.slug}`,
          "",
          `Turn off these emails: ${SITE_URL}/account`,
        ].join("\n"),
        `alert-${event._id}-${user._id}`,
      )
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.alerts.send, {
        eventId: args.eventId,
        cursor: page.continueCursor,
      })
    }
    return null
  },
})
