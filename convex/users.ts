import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { emailOf, isAdmin, requireUser } from "./lib"

export const createUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal("emailMagicLink"),
      profile: v.object({}),
    }),
  },
  returns: v.id("users"),
  handler: async (ctx) => {
    return await ctx.db.insert("users", { alerts: true })
  },
})

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    const user = await ctx.db.get("users", userId)
    if (user === null) return null
    return {
      _id: user._id,
      name: user.name ?? "",
      alerts: user.alerts ?? false,
      email: await emailOf(ctx, userId),
      isAdmin: await isAdmin(ctx, userId),
    }
  },
})

export const update = mutation({
  args: { name: v.string(), alerts: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    await ctx.db.patch("users", userId, {
      name: args.name.trim().slice(0, 60),
      alerts: args.alerts,
    })
    return null
  },
})
