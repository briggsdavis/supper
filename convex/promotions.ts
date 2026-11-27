import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { requireAdmin } from "./lib"
import { vAnnouncementFields, vPopupFields } from "./schema"

function color(value: string) {
  const hex = value.trim().replace(/^#/, "").toLowerCase()
  if (/^[\da-f]{3}$/.test(hex)) return "#" + [...hex].map((letter) => letter.repeat(2)).join("")
  if (/^[\da-f]{6}$/.test(hex)) return "#" + hex
  throw new ConvexError("Enter a valid hex color, such as #171717.")
}

function content(value: string, label: string) {
  const text = value.trim()
  if (!text) throw new ConvexError(`${label} is required.`)
  return text
}

function link(value: string) {
  const url = value.trim()
  const hasControl = [...url].some((character) => character < " " || character === "\x7f")
  if (!hasControl && !/[\\\s]/.test(url)) {
    if (url.startsWith("/") && !url.startsWith("//")) return url
    if (/^https?:\/\//i.test(url)) {
      try {
        return new URL(url).href
      } catch {
        // Report a validation error below.
      }
    }
  }
  throw new ConvexError("Use a site path like /dinners or an absolute https:// link.")
}

function activeAnnouncement(ctx: QueryCtx) {
  return ctx.db
    .query("announcementBars")
    .withIndex("by_active", (q) => q.eq("active", true))
    .unique()
}

function activePopup(ctx: QueryCtx) {
  return ctx.db
    .query("popups")
    .withIndex("by_active", (q) => q.eq("active", true))
    .unique()
}

async function withImage(ctx: QueryCtx, popup: Doc<"popups">) {
  return { ...popup, imageUrl: popup.imageId ? await ctx.storage.getUrl(popup.imageId) : null }
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const [announcement, popup] = await Promise.all([activeAnnouncement(ctx), activePopup(ctx)])
    return { announcement, popup: popup ? await withImage(ctx, popup) : null }
  },
})

export const listAnnouncements = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx)
    return await ctx.db.query("announcementBars").order("desc").paginate(paginationOpts)
  },
})

export const getAnnouncement = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    const key = ctx.db.normalizeId("announcementBars", id)
    return key ? await ctx.db.get("announcementBars", key) : null
  },
})

export const saveAnnouncement = mutation({
  args: { ...vAnnouncementFields, id: v.optional(v.id("announcementBars")) },
  returns: v.id("announcementBars"),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx)
    const value = {
      text: content(fields.text, "Announcement text"),
      color: color(fields.color),
      link: fields.link?.trim() ? link(fields.link) : undefined,
      active: fields.active,
    }
    if (id && !(await ctx.db.get("announcementBars", id))) {
      throw new ConvexError("This announcement bar no longer exists.")
    }
    if (value.active) {
      const current = await activeAnnouncement(ctx)
      if (current && current._id !== id) {
        await ctx.db.patch("announcementBars", current._id, { active: false })
      }
    }
    if (!id) return await ctx.db.insert("announcementBars", value)
    await ctx.db.replace("announcementBars", id, value)
    return id
  },
})

export const removeAnnouncement = mutation({
  args: { id: v.id("announcementBars") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    await ctx.db.delete("announcementBars", id)
    return null
  },
})

export const listPopups = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx)
    return await ctx.db.query("popups").order("desc").paginate(paginationOpts)
  },
})

export const getPopup = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    const key = ctx.db.normalizeId("popups", id)
    const popup = key ? await ctx.db.get("popups", key) : null
    return popup ? await withImage(ctx, popup) : null
  },
})

export const uploadPopupImage = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const savePopup = mutation({
  args: {
    ...vPopupFields,
    id: v.optional(v.id("popups")),
    image: v.optional(v.union(v.id("_storage"), v.null())),
  },
  returns: v.id("popups"),
  handler: async (ctx, { id, image, ...fields }) => {
    await requireAdmin(ctx)
    const old = id ? await ctx.db.get("popups", id) : null
    if (id && !old) throw new ConvexError("This popup no longer exists.")
    const imageId = image === undefined ? old?.imageId : (image ?? undefined)
    const value = {
      title: content(fields.title, "Title"),
      text: fields.text.trim(),
      backgroundColor: color(fields.backgroundColor),
      textColor: color(fields.textColor),
      layout: fields.layout,
      captureEmail: fields.captureEmail,
      button: fields.button && {
        text: content(fields.button.text, "Button text"),
        color: color(fields.button.color),
        link: link(fields.button.link),
      },
      active: fields.active,
      imageId,
    }
    if (value.layout !== "none" && !imageId)
      throw new ConvexError("Choose an image for this layout.")
    if (imageId && imageId !== old?.imageId) {
      const file = await ctx.db.system.get("_storage", imageId)
      if (!file?.contentType?.startsWith("image/")) throw new ConvexError("Choose an image file.")
    }
    if (value.active) {
      const current = await activePopup(ctx)
      if (current && current._id !== id)
        await ctx.db.patch("popups", current._id, { active: false })
    }
    if (!id) return await ctx.db.insert("popups", value)
    await ctx.db.replace("popups", id, value)
    if (old?.imageId && old.imageId !== imageId) await ctx.storage.delete(old.imageId)
    return id
  },
})

export const removePopup = mutation({
  args: { id: v.id("popups") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    const popup = await ctx.db.get("popups", id)
    if (popup?.imageId) await ctx.storage.delete(popup.imageId)
    await ctx.db.delete("popups", id)
    return null
  },
})

export const signup = mutation({
  args: { popupId: v.id("popups"), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { popupId, ...fields }) => {
    const email = fields.email.trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
      throw new ConvexError("Enter a valid email address.")
    }
    const popup = await ctx.db.get("popups", popupId)
    if (!popup?.active || !popup.captureEmail) {
      throw new ConvexError("This signup is closed.")
    }
    const existing = await ctx.db
      .query("popupSignups")
      .withIndex("by_popupId_and_email", (q) => q.eq("popupId", popupId).eq("email", email))
      .unique()
    if (!existing) await ctx.db.insert("popupSignups", { popupId, email, popupTitle: popup.title })
    return null
  },
})

export const listSignups = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx)
    return await ctx.db.query("popupSignups").order("desc").paginate(paginationOpts)
  },
})
