import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import { components } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { env, type QueryCtx } from "./_generated/server"

type AuthCtx = Pick<QueryCtx, "auth" | "runQuery">

export async function withRecipeImage(ctx: QueryCtx, recipe: Doc<"recipes">) {
  return {
    ...recipe,
    imageUrl: recipe.imageId ? await ctx.storage.getUrl(recipe.imageId) : null,
  }
}

const admins = () =>
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

export async function emailOf(ctx: Pick<QueryCtx, "runQuery">, userId: Id<"users">) {
  return await ctx.runQuery(components.authEmail.verifiedEmails.getPrimaryEmail, { userId })
}

export async function isAdmin(ctx: AuthCtx, userId: Id<"users">) {
  const email = await emailOf(ctx, userId)
  return email !== null && admins().includes(email.toLowerCase())
}

export async function requireUser(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx)
  if (userId === null) throw new ConvexError("Sign in first.")
  return userId
}

export async function requireAdmin(ctx: AuthCtx) {
  const userId = await requireUser(ctx)
  if (!(await isAdmin(ctx, userId))) throw new ConvexError("Admins only.")
  return userId
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  )
}

export async function uniqueSlug(
  taken: (slug: string) => Promise<{ _id: string } | null>,
  base: string,
  selfId?: string,
) {
  const root = slugify(base)
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`
    const hit = await taken(slug)
    if (hit === null || hit._id === selfId) return slug
  }
}
