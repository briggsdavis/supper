import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=75&fm=jpg`
const clip = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`

const GALLERIES: Record<string, string[]> = {
  "ratatouille-2007": [
    photo("photo-1499856871958-5b9627545d1a"),
    clip(39535),
    photo("photo-1572453800999-e8d2d1589b7c"),
    photo("photo-1579027989536-b7b1f875659b"),
    photo("photo-1551218808-94e220e084d2"),
    clip(4353),
    photo("photo-1786229527541-a29d0a99fa38"),
    photo("photo-1568471173242-461f0a730452"),
    photo("photo-1579113800032-c38bd7635818"),
    photo("photo-1774689338470-e4ae7d63670d"),
    photo("photo-1616091216791-a5360b5fc78a"),
    photo("photo-1471193945509-9ad0617afabf"),
  ],
  "the-godfather-1972": [
    photo("photo-1515516969-d4008cc6241a"),
    clip(41257),
    photo("photo-1532117472055-4d0734b51f31"),
    photo("photo-1598222446273-bbe74e3abd1e"),
    photo("photo-1772494047824-c664b7e24ee8"),
    photo("photo-1676324558731-019dfc39b394"),
    clip(16589),
    photo("photo-1727840432422-04b498e3ba24"),
    photo("photo-1710092855526-295542f86ddf"),
    photo("photo-1752572051983-3a39d2ab77e8"),
    photo("photo-1633173425287-e5c46ac86492"),
    photo("photo-1769812343462-84c46af1e156"),
  ],
  "pulp-fiction-1994": [
    photo("photo-1765087909999-754261788116"),
    clip(14010),
    photo("photo-1568901346375-23c9450c58cd"),
    photo("photo-1566276314837-a00b950f1feb"),
    photo("photo-1572490122747-3968b75cc699"),
    photo("photo-1637472480890-ede76e753687"),
    clip(35812),
    photo("photo-1712669079274-57e5de8aca9e"),
    photo("photo-1518013431117-eb1465fa5752"),
    photo("photo-1710533820700-dd6f6623cc97"),
    photo("photo-1569775931713-52512a1f1b96"),
    photo("photo-1761935898229-944f625e0c79"),
  ],
}

export const run = internalAction({
  args: { slug: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const [slug, urls] of Object.entries(GALLERIES)) {
      if (args.slug && args.slug !== slug) continue
      const count: number = await ctx.runQuery(internal.media.seedCount, { slug })
      if (count !== 0) continue
      for (const url of urls) {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
        const blob = await res.blob()
        const storageId = await ctx.storage.store(blob)
        await ctx.runMutation(internal.media.seedAdd, { slug, storageId })
      }
    }
    return null
  },
})
