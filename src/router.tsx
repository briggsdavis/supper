import type { ComponentType } from "react"
import { createBrowserRouter, Navigate, useParams, type RouteObject } from "react-router"
import App from "./app.tsx"
import { routeMotionLoader } from "./route-motion.ts"
import ErrorPage from "./routes/error.tsx"
import Home from "./routes/home.tsx"

function Moved({ to }: { to: string }) {
  const { slug } = useParams()
  return <Navigate to={slug ? `${to}/${slug}` : to} replace />
}

const load = async (module: Promise<{ default: ComponentType }>) => ({
  Component: (await module).default,
})

// Every public route waits for the current page to blur out before it commits.
const withMotion = (routes: RouteObject[]): RouteObject[] =>
  routes.map((route) => (route.path === "admin" ? route : { ...route, loader: routeMotionLoader }))

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary: ErrorPage,
    children: withMotion([
      { index: true, Component: Home },
      { path: "contact", lazy: () => load(import("./routes/contact.tsx")) },
      { path: "dinners", lazy: () => load(import("./routes/events.tsx")) },
      { path: "dinners/:slug", lazy: () => load(import("./routes/event.tsx")) },
      { path: "movies", lazy: () => load(import("./routes/titles.tsx")) },
      { path: "movies/:slug", lazy: () => load(import("./routes/title.tsx")) },
      { path: "events", element: <Moved to="/dinners" /> },
      { path: "events/:slug", element: <Moved to="/dinners" /> },
      { path: "titles", element: <Moved to="/movies" /> },
      { path: "titles/:slug", element: <Moved to="/movies" /> },
      { path: "recipes", lazy: () => load(import("./routes/recipes.tsx")) },
      { path: "recipes/:slug", lazy: () => load(import("./routes/recipe.tsx")) },
      { path: "sign-in", lazy: () => load(import("./routes/sign-in.tsx")) },
      { path: "sign-in-with-link", lazy: () => load(import("./routes/sign-in-with-link.tsx")) },
      { path: "account", lazy: () => load(import("./routes/account.tsx")) },
      { path: "checkout/success", lazy: () => load(import("./routes/checkout-success.tsx")) },
      { path: "chromatic", lazy: () => load(import("./routes/chromatic.tsx")) },
      { path: "morphs", lazy: () => load(import("./routes/morphs.tsx")) },
      {
        path: "admin",
        lazy: () => load(import("./routes/admin/layout.tsx")),
        children: [
          { index: true, element: <Navigate to="/admin/dinners" replace /> },
          { path: "dinners", lazy: () => load(import("./routes/admin/events.tsx")) },
          { path: "dinners/new", lazy: () => load(import("./routes/admin/event-form.tsx")) },
          { path: "dinners/:id", lazy: () => load(import("./routes/admin/event-form.tsx")) },
          { path: "dinners/:id/guests", lazy: () => load(import("./routes/admin/guests.tsx")) },
          { path: "movies", lazy: () => load(import("./routes/admin/titles.tsx")) },
          { path: "movies/new", lazy: () => load(import("./routes/admin/title-form.tsx")) },
          { path: "movies/:id", lazy: () => load(import("./routes/admin/title-form.tsx")) },
          { path: "recipes/new", lazy: () => load(import("./routes/admin/recipe-form.tsx")) },
          { path: "recipes/:id", lazy: () => load(import("./routes/admin/recipe-form.tsx")) },
          {
            path: "announcement-bars",
            lazy: () => load(import("./routes/admin/announcement-bars.tsx")),
          },
          {
            path: "announcement-bars/:id",
            lazy: async () => ({
              Component: (await import("./routes/admin/announcement-bars.tsx")).EditAnnouncement,
            }),
          },
          { path: "popups", lazy: () => load(import("./routes/admin/popups.tsx")) },
          {
            path: "popups/:id",
            lazy: async () => ({
              Component: (await import("./routes/admin/popups.tsx")).EditPopup,
            }),
          },
          { path: "emails", lazy: () => load(import("./routes/admin/emails.tsx")) },
        ],
      },
      { path: "*", lazy: () => load(import("./routes/missing.tsx")) },
    ]),
  },
])
