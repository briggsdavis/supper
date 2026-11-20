import { v } from "convex/values"
import { internalMutation } from "./_generated/server"

const TITLES = [
  {
    slug: "ratatouille-2007",
    name: "Ratatouille",
    kind: "movie" as const,
    year: 2007,
    synopsis:
      "A rat with a gift for cooking teams up with a young garbage boy to chase his dream in the kitchen of a famous Paris restaurant.",
    recipes: [
      {
        slug: "confit-byaldi-ratatouille",
        name: "Confit byaldi",
        summary: "The thin-sliced, layered ratatouille Remy serves Anton Ego.",
        videoUrl: "https://www.youtube.com/watch?v=roCX0AfBseQ",
        ingredients: [
          "1 zucchini",
          "1 yellow squash",
          "1 Japanese eggplant",
          "4 Roma tomatoes",
          "1 red bell pepper",
          "1 yellow bell pepper",
          "1 onion",
          "3 cloves garlic",
          "Thyme, olive oil, salt",
        ],
        steps: [
          "Roast and peel the peppers. Cook them down with onion, garlic and tomato into a piperade.",
          "Spread the piperade in a skillet.",
          "Slice the zucchini, squash, eggplant and tomatoes thin and shingle them in a spiral on top.",
          "Drizzle with oil, season, cover with parchment and bake at 275F for about 2 hours.",
          "Stack a neat tower on the plate and spoon over a pepper vinaigrette.",
        ],
      },
    ],
  },
  {
    slug: "the-godfather-1972",
    name: "The Godfather",
    kind: "movie" as const,
    year: 1972,
    synopsis:
      "The aging head of a crime family hands control of his empire to his reluctant youngest son.",
    recipes: [
      {
        slug: "cannoli-the-godfather",
        name: "Cannoli",
        summary: "Leave the gun. Take the cannoli.",
        videoUrl: "https://www.youtube.com/watch?v=44fjX-rgJ7s",
        sourceUrl: "https://www.babi.sh/recipes/thegodfathercannolis",
        ingredients: [
          "2 cups flour",
          "2 tbsp sugar",
          "2 tbsp butter",
          "1 egg",
          "1/2 cup Marsala",
          "2 lb whole-milk ricotta, drained",
          "1 cup powdered sugar",
          "Mini chocolate chips, candied orange",
          "Oil for frying",
        ],
        steps: [
          "Make a stiff dough with flour, sugar, butter, egg and Marsala. Rest 1 hour.",
          "Roll very thin, cut rounds and wrap around cannoli tubes.",
          "Fry at 360F until blistered and golden. Cool and slide off the tubes.",
          "Beat the drained ricotta with powdered sugar. Fold in chips and orange.",
          "Pipe into the shells right before serving.",
        ],
      },
    ],
  },
  {
    slug: "pulp-fiction-1994",
    name: "Pulp Fiction",
    kind: "movie" as const,
    year: 1994,
    synopsis:
      "Two hitmen, a boxer, a gangster's wife and a pair of diner robbers cross paths in four tales of violence and redemption in Los Angeles.",
    recipes: [
      {
        slug: "big-kahuna-burger-pulp-fiction",
        name: "Big Kahuna Burger",
        summary: "That is a tasty burger.",
        videoUrl: "https://www.youtube.com/watch?v=OmwE0aJqkdA",
        ingredients: [
          "1 lb ground chuck",
          "4 brioche buns",
          "4 pineapple rings",
          "Teriyaki glaze",
          "Swiss or American cheese",
          "Lettuce, tomato, red onion",
        ],
        steps: [
          "Form loose patties and season well.",
          "Grill the pineapple until charred.",
          "Sear the patties hard, glaze with teriyaki and melt the cheese on top.",
          "Build on toasted buns with pineapple and the fixings.",
        ],
      },
    ],
  },
]

export const run = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const { recipes, ...title } of TITLES) {
      let titleId = (
        await ctx.db
          .query("titles")
          .withIndex("by_slug", (q) => q.eq("slug", title.slug))
          .unique()
      )?._id
      titleId ??= await ctx.db.insert("titles", title)
      for (const recipe of recipes) {
        const hit = await ctx.db
          .query("recipes")
          .withIndex("by_slug", (q) => q.eq("slug", recipe.slug))
          .unique()
        if (hit === null) await ctx.db.insert("recipes", { ...recipe, titleId })
      }
    }
    const rat = await ctx.db
      .query("titles")
      .withIndex("by_slug", (q) => q.eq("slug", "ratatouille-2007"))
      .unique()
    const slug = "ratatouille-2026-12-20"
    const hit = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (rat && hit === null) {
      await ctx.db.insert("events", {
        slug,
        titleId: rat._id,
        startsAt: Date.UTC(2026, 11, 20, 0, 0),
        venue: "Venue TBA",
        address: "Address TBA",
        priceCents: 8500,
        capacity: 40,
        sold: 0,
        published: true,
        note: "Doors at 6:30. Film starts at 7. Each course lands with its scene.",
        menu: [
          { course: "To start", dish: "Potato leek soup" },
          { course: "Main", dish: "Confit byaldi with pepper vinaigrette" },
          { course: "Dessert", dish: "Creme brulee" },
        ],
      })
    }
    return null
  },
})

export const uploadUrl = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
})

export const setPoster = internalMutation({
  args: { slug: v.string(), posterId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const title = await ctx.db
      .query("titles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (title === null) throw new Error(`No title ${args.slug}`)
    if (title.posterId) await ctx.storage.delete(title.posterId)
    await ctx.db.patch("titles", title._id, { posterId: args.posterId })
    return null
  },
})
