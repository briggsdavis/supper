import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { isAdmin, requireUser } from "./lib"

const vTarget = v.union(
  v.object({ titleId: v.id("titles") }),
  v.object({ eventId: v.id("events") }),
)

export const list = query({
  args: { target: vTarget },
  handler: async (ctx, { target }) => {
    const viewer = await getAuthUserId(ctx)
    const admin = viewer !== null && (await isAdmin(ctx, viewer))
    const comments =
      "titleId" in target
        ? await ctx.db
            .query("comments")
            .withIndex("by_titleId", (q) => q.eq("titleId", target.titleId))
            .order("desc")
            .take(100)
        : await ctx.db
            .query("comments")
            .withIndex("by_eventId", (q) => q.eq("eventId", target.eventId))
            .order("desc")
            .take(100)
    return await Promise.all(
      comments.map(async (c) => {
        const user = await ctx.db.get("users", c.userId)
        return {
          _id: c._id,
          _creationTime: c._creationTime,
          body: c.body,
          author: user?.name || "Guest",
          canDelete: admin || c.userId === viewer,
        }
      }),
    )
  },
})

export const add = mutation({
  args: { target: vTarget, body: v.string() },
  returns: v.id("comments"),
  handler: async (ctx, { target, body }) => {
    const userId = await requireUser(ctx)
    const text = body.trim()
    if (!text) throw new ConvexError("Write something first.")
    if (text.length > 1000) throw new ConvexError("Keep it under 1000 characters.")
    if ("eventId" in target && (await ctx.db.get("events", target.eventId)) === null)
      throw new ConvexError("Not found.")
    if ("titleId" in target && (await ctx.db.get("titles", target.titleId)) === null)
      throw new ConvexError("Not found.")
    return await ctx.db.insert("comments", { userId, ...target, body: text })
  },
})

export const remove = mutation({
  args: { id: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    const comment = await ctx.db.get("comments", args.id)
    if (comment === null) return null
    if (comment.userId !== userId && !(await isAdmin(ctx, userId)))
      throw new ConvexError("Not yours.")
    await ctx.db.delete("comments", args.id)
    return null
  },
})
