import type { ComponentType } from "react"
import { createBrowserRouter } from "react-router"
import App from "./app.tsx"
import ErrorPage from "./routes/error.tsx"
import Home from "./routes/home.tsx"

const load = async (module: Promise<{ default: ComponentType }>) => ({
  Component: (await module).default,
})

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary: ErrorPage,
    children: [
      { index: true, Component: Home },
      { path: "contact", lazy: () => load(import("./routes/contact.tsx")) },
      { path: "events", lazy: () => load(import("./routes/events.tsx")) },
      { path: "events/:slug", lazy: () => load(import("./routes/event.tsx")) },
      { path: "titles", lazy: () => load(import("./routes/titles.tsx")) },
      { path: "titles/:slug", lazy: () => load(import("./routes/title.tsx")) },
      { path: "recipes/:slug", lazy: () => load(import("./routes/recipe.tsx")) },
      { path: "sign-in", lazy: () => load(import("./routes/sign-in.tsx")) },
      { path: "sign-in-with-link", lazy: () => load(import("./routes/sign-in-with-link.tsx")) },
      { path: "account", lazy: () => load(import("./routes/account.tsx")) },
      { path: "checkout/success", lazy: () => load(import("./routes/checkout-success.tsx")) },
      { path: "chromatic", lazy: () => load(import("./routes/chromatic.tsx")) },
      {
        path: "admin",
        lazy: () => load(import("./routes/admin/layout.tsx")),
        children: [
          { index: true, lazy: () => load(import("./routes/admin/events.tsx")) },
          { path: "events/new", lazy: () => load(import("./routes/admin/event-form.tsx")) },
          { path: "events/:id", lazy: () => load(import("./routes/admin/event-form.tsx")) },
          { path: "events/:id/guests", lazy: () => load(import("./routes/admin/guests.tsx")) },
          { path: "titles", lazy: () => load(import("./routes/admin/titles.tsx")) },
          { path: "titles/new", lazy: () => load(import("./routes/admin/title-form.tsx")) },
          { path: "titles/:id", lazy: () => load(import("./routes/admin/title-form.tsx")) },
          { path: "recipes/new", lazy: () => load(import("./routes/admin/recipe-form.tsx")) },
          { path: "recipes/:id", lazy: () => load(import("./routes/admin/recipe-form.tsx")) },
        ],
      },
      { path: "*", lazy: () => load(import("./routes/missing.tsx")) },
    ],
  },
])
