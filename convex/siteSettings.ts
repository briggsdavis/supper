import { v } from "convex/values"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { requireAdmin } from "./lib"

const readHomepage = (ctx: Pick<QueryCtx, "db">) =>
  ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "homepage")).unique()

export const homepageContent = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => (await readHomepage(ctx))?.showHomepageContent ?? true,
})

export const setHomepageContent = mutation({
  args: { visible: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { visible }) => {
    await requireAdmin(ctx)
    const settings = await readHomepage(ctx)
    if (settings) {
      await ctx.db.patch("siteSettings", settings._id, { showHomepageContent: visible })
    } else {
      await ctx.db.insert("siteSettings", { key: "homepage", showHomepageContent: visible })
    }
    return null
  },
})
