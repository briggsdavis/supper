import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { isAdmin, requireUser } from "./lib"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getAuthUserId(ctx)
    const admin = viewer !== null && (await isAdmin(ctx, viewer))
    const suggestions = await ctx.db.query("suggestions").order("desc").take(100)
    return await Promise.all(
      suggestions.map(async (s) => {
        const user = await ctx.db.get("users", s.userId)
        return {
          _id: s._id,
          _creationTime: s._creationTime,
          movie: s.movie,
          food: s.food,
          author: user?.name || "Guest",
          canDelete: admin || s.userId === viewer,
        }
      }),
    )
  },
})

export const add = mutation({
  args: { movie: v.string(), food: v.string() },
  returns: v.id("suggestions"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    const movie = args.movie.trim()
    const food = args.food.trim()
    if (!movie) throw new ConvexError("Name a movie or show.")
    if (!food) throw new ConvexError("Tell us what to cook.")
    if (movie.length > 200) throw new ConvexError("Keep the title under 200 characters.")
    if (food.length > 1000) throw new ConvexError("Keep it under 1000 characters.")
    return await ctx.db.insert("suggestions", { userId, movie, food })
  },
})

export const remove = mutation({
  args: { id: v.id("suggestions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    const suggestion = await ctx.db.get("suggestions", args.id)
    if (suggestion === null) return null
    if (suggestion.userId !== userId && !(await isAdmin(ctx, userId)))
      throw new ConvexError("Not yours.")
    await ctx.db.delete("suggestions", args.id)
    return null
  },
})
