import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
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
      ...nameParts(user),
      alerts: user.alerts ?? false,
      hasFullName: hasFullName(user),
      email: await emailOf(ctx, userId),
      isAdmin: await isAdmin(ctx, userId),
    }
  },
})

export function nameParts(user: Doc<"users">) {
  if (user.firstName !== undefined || user.lastName !== undefined) {
    return { firstName: user.firstName ?? "", lastName: user.lastName ?? "" }
  }
  const [firstName = "", ...rest] = (user.name ?? "").trim().split(/\s+/)
  return { firstName, lastName: rest.join(" ") }
}

export function hasFullName(user: Doc<"users"> | null) {
  return !!user?.firstName?.trim() && !!user.lastName?.trim()
}

function cleanName(value: string, label: string) {
  const name = value.trim().replace(/\s+/g, " ").slice(0, 40)
  if (!name) throw new ConvexError(`${label} is required.`)
  return name
}

function names(args: { firstName: string; lastName: string }) {
  const firstName = cleanName(args.firstName, "First name")
  const lastName = cleanName(args.lastName, "Last name")
  return { firstName, lastName, name: `${firstName} ${lastName}` }
}

export const setAlerts = mutation({
  args: { alerts: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    await ctx.db.patch("users", userId, { alerts: args.alerts })
    return null
  },
})

export const setName = mutation({
  args: { firstName: v.string(), lastName: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    await ctx.db.patch("users", userId, names(args))
    return null
  },
})
