import { ConvexError, v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { requireAdmin, uniqueSlug } from "./lib"
import { vKind } from "./schema"

export async function withPoster(ctx: QueryCtx, title: Doc<"titles">) {
  return { ...title, posterUrl: title.posterId ? await ctx.storage.getUrl(title.posterId) : null }
}

export const list = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const q = args.search.trim()
    const titles = q
      ? await ctx.db
          .query("titles")
          .withSearchIndex("search_name", (s) => s.search("name", q))
          .take(40)
      : await ctx.db.query("titles").order("desc").take(60)
    return await Promise.all(titles.map((t) => withPoster(ctx, t)))
  },
})

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const title = await ctx.db
      .query("titles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (title === null) return null
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_titleId", (q) => q.eq("titleId", title._id))
      .take(50)
    const events = await ctx.db
      .query("events")
      .withIndex("by_titleId", (q) => q.eq("titleId", title._id))
      .take(20)
    return {
      ...(await withPoster(ctx, title)),
      recipes,
      events: events.filter((e) => e.published),
    }
  },
})

export const all = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query("titles").order("desc").take(200)
  },
})

export const byId = query({
  args: { id: v.id("titles") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const title = await ctx.db.get("titles", args.id)
    if (title === null) return null
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_titleId", (q) => q.eq("titleId", title._id))
      .take(100)
    return { ...(await withPoster(ctx, title)), recipes }
  },
})

export const save = mutation({
  args: {
    id: v.optional(v.id("titles")),
    name: v.string(),
    kind: vKind,
    year: v.optional(v.number()),
    synopsis: v.string(),
    posterId: v.optional(v.id("_storage")),
  },
  returns: v.id("titles"),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx)
    const name = fields.name.trim()
    if (!name) throw new ConvexError("Name is required.")
    const slug = await uniqueSlug(
      (s) =>
        ctx.db
          .query("titles")
          .withIndex("by_slug", (q) => q.eq("slug", s))
          .unique(),
      fields.year ? `${name} ${fields.year}` : name,
      id,
    )
    const doc = { ...fields, name, slug, synopsis: fields.synopsis.trim() }
    if (id === undefined) return await ctx.db.insert("titles", doc)
    const old = await ctx.db.get("titles", id)
    if (old === null) throw new ConvexError("Title not found.")
    if (old.posterId && old.posterId !== doc.posterId) await ctx.storage.delete(old.posterId)
    await ctx.db.replace("titles", id, doc)
    return id
  },
})

export const remove = mutation({
  args: { id: v.id("titles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const event = await ctx.db
      .query("events")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.id))
      .first()
    if (event !== null) throw new ConvexError("Delete this title's dinners first.")
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.id))
      .take(200)
    for (const r of recipes) await ctx.db.delete("recipes", r._id)
    const title = await ctx.db.get("titles", args.id)
    if (title?.posterId) await ctx.storage.delete(title.posterId)
    await ctx.db.delete("titles", args.id)
    return null
  },
})

export const uploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})
