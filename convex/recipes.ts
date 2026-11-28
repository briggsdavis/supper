import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAdmin, uniqueSlug, withRecipeImage } from "./lib"
import { withPoster } from "./titles"

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const recipe = await ctx.db
      .query("recipes")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (recipe === null) return null
    const title = await ctx.db.get("titles", recipe.titleId)
    return {
      ...(await withRecipeImage(ctx, recipe)),
      title: title && (await withPoster(ctx, title)),
    }
  },
})

export const latest = query({
  args: {},
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").order("desc").take(6)
    return await Promise.all(
      recipes.map(async (r) => ({ ...r, title: await ctx.db.get("titles", r.titleId) })),
    )
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").order("desc").take(200)
    const titles = new Map(
      await Promise.all(
        [...new Set(recipes.map((r) => r.titleId))].map(
          async (id) => [id, await ctx.db.get("titles", id)] as const,
        ),
      ),
    )
    return await Promise.all(
      recipes.map(async (r) => {
        const title = titles.get(r.titleId)
        return {
          ...(await withRecipeImage(ctx, r)),
          title: title ? { name: title.name, slug: title.slug, year: title.year } : null,
        }
      }),
    )
  },
})

export const featured = query({
  args: {},
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").take(50)
    const withImages = recipes.filter((r) => r.imageId).slice(0, 6)
    return await Promise.all(
      withImages.map(async (r) => ({
        ...(await withRecipeImage(ctx, r)),
        title: await ctx.db.get("titles", r.titleId),
      })),
    )
  },
})

export const byId = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await ctx.db.get("recipes", args.id)
  },
})

const clean = (lines: string[]) => lines.map((l) => l.trim()).filter(Boolean)

export const save = mutation({
  args: {
    id: v.optional(v.id("recipes")),
    titleId: v.id("titles"),
    name: v.string(),
    summary: v.string(),
    videoUrl: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    ingredients: v.array(v.string()),
    steps: v.array(v.string()),
  },
  returns: v.id("recipes"),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx)
    const name = fields.name.trim()
    if (!name) throw new ConvexError("Name is required.")
    const title = await ctx.db.get("titles", fields.titleId)
    if (title === null) throw new ConvexError("Title not found.")
    const slug = await uniqueSlug(
      (s) =>
        ctx.db
          .query("recipes")
          .withIndex("by_slug", (q) => q.eq("slug", s))
          .unique(),
      `${name} ${title.name}`,
      id,
    )
    const doc = {
      ...fields,
      name,
      slug,
      summary: fields.summary.trim(),
      videoUrl: fields.videoUrl?.trim() || undefined,
      sourceUrl: fields.sourceUrl?.trim() || undefined,
      ingredients: clean(fields.ingredients),
      steps: clean(fields.steps),
    }
    if (id === undefined) return await ctx.db.insert("recipes", doc)
    await ctx.db.patch("recipes", id, doc)
    return id
  },
})

export const remove = mutation({
  args: { id: v.id("recipes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    await ctx.db.delete("recipes", args.id)
    return null
  },
})
