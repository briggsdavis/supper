import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { requireAdmin } from "./lib"
import { MAX_MEDIA_PER_TITLE, mediaKind, mediaProblem } from "./limits"

export async function titleMedia(ctx: QueryCtx, titleId: Id<"titles">) {
  const items = await ctx.db
    .query("titleMedia")
    .withIndex("by_titleId_and_order", (q) => q.eq("titleId", titleId))
    .take(MAX_MEDIA_PER_TITLE)
  const withUrls = await Promise.all(
    items.map(async (m) => ({
      _id: m._id,
      kind: m.kind,
      url: await ctx.storage.getUrl(m.storageId),
    })),
  )
  return withUrls.filter((m) => m.url !== null) as {
    _id: Id<"titleMedia">
    kind: "image" | "video"
    url: string
  }[]
}

async function insertMedia(ctx: MutationCtx, titleId: Id<"titles">, storageId: Id<"_storage">) {
  const file = await ctx.db.system.get("_storage", storageId)
  if (file === null) throw new ConvexError("Upload not found.")
  const problem = mediaProblem(file.contentType, file.size)
  const kind = mediaKind(file.contentType)
  if (problem || !kind) {
    await ctx.storage.delete(storageId)
    throw new ConvexError(problem ?? "Unsupported file.")
  }
  const existing = await ctx.db
    .query("titleMedia")
    .withIndex("by_titleId_and_order", (q) => q.eq("titleId", titleId))
    .order("desc")
    .take(MAX_MEDIA_PER_TITLE)
  if (existing.length >= MAX_MEDIA_PER_TITLE) {
    await ctx.storage.delete(storageId)
    throw new ConvexError(`A title can have up to ${MAX_MEDIA_PER_TITLE} gallery items.`)
  }
  const order = (existing[0]?.order ?? 0) + 1
  return await ctx.db.insert("titleMedia", { titleId, storageId, kind, order })
}

export async function removeAllMedia(ctx: MutationCtx, titleId: Id<"titles">) {
  const items = await ctx.db
    .query("titleMedia")
    .withIndex("by_titleId_and_order", (q) => q.eq("titleId", titleId))
    .take(MAX_MEDIA_PER_TITLE * 2)
  for (const m of items) {
    await ctx.storage.delete(m.storageId)
    await ctx.db.delete("titleMedia", m._id)
  }
}

export const uploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const add = mutation({
  args: { titleId: v.id("titles"), storageId: v.id("_storage") },
  returns: v.id("titleMedia"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    if ((await ctx.db.get("titles", args.titleId)) === null) {
      await ctx.storage.delete(args.storageId)
      throw new ConvexError("Title not found.")
    }
    return await insertMedia(ctx, args.titleId, args.storageId)
  },
})

export const remove = mutation({
  args: { id: v.id("titleMedia") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const item = await ctx.db.get("titleMedia", args.id)
    if (item === null) return null
    await ctx.storage.delete(item.storageId)
    await ctx.db.delete("titleMedia", item._id)
    return null
  },
})

export const move = mutation({
  args: { id: v.id("titleMedia"), direction: v.union(v.literal(-1), v.literal(1)) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const item = await ctx.db.get("titleMedia", args.id)
    if (item === null) return null
    const neighbor = await ctx.db
      .query("titleMedia")
      .withIndex("by_titleId_and_order", (q) =>
        args.direction < 0
          ? q.eq("titleId", item.titleId).lt("order", item.order)
          : q.eq("titleId", item.titleId).gt("order", item.order),
      )
      .order(args.direction < 0 ? "desc" : "asc")
      .first()
    if (neighbor === null) return null
    await ctx.db.patch("titleMedia", item._id, { order: neighbor.order })
    await ctx.db.patch("titleMedia", neighbor._id, { order: item.order })
    return null
  },
})

export const seedAdd = internalMutation({
  args: { slug: v.string(), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const title = await ctx.db
      .query("titles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (title === null) {
      await ctx.storage.delete(args.storageId)
      throw new Error(`No title ${args.slug}`)
    }
    await insertMedia(ctx, title._id, args.storageId)
    return null
  },
})

export const seedCount = internalQuery({
  args: { slug: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const title = await ctx.db
      .query("titles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (title === null) return -1
    const items = await ctx.db
      .query("titleMedia")
      .withIndex("by_titleId_and_order", (q) => q.eq("titleId", title._id))
      .take(MAX_MEDIA_PER_TITLE)
    return items.length
  },
})
