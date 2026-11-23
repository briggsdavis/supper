import type { FormEvent } from "react"
import { Disc, solidButton } from "../components/marketing.tsx"

const label =
  "grid gap-1.25 font-mono text-xs tracking-[0.055em] text-muted motion-safe:animate-enter"
const field =
  "w-full border-0 border-b border-[#777] bg-transparent py-3 font-sans text-sm text-paper transition-[border-color,box-shadow] duration-250 placeholder:text-[#96928d] focus:border-paper focus:shadow-[0_1px_var(--color-paper)] focus:outline-none"

function openEmailDraft(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const fields = new FormData(event.currentTarget)
  const subject = encodeURIComponent("A note for Scenes & Supper")
  const body = encodeURIComponent(
    `${fields.get("message")}\n\n${fields.get("name")}\n${fields.get("email")}`,
  )
  window.location.href = `mailto:hello@scenesandsupper.com?subject=${subject}&body=${body}`
}

export default function Contact() {
  return (
    <section className="relative isolate overflow-hidden pt-21.5 text-paper max-md:pt-24">
      <Disc className="top-[15%] -right-45 w-[min(34.375rem,95vw)] opacity-27" />
      <div className="relative mx-auto flex min-h-[calc(100svh-5.375rem)] w-[min(36.875rem,84vw)] flex-col justify-center pt-8 pb-14 max-md:min-h-[calc(100svh-6rem)]">
        <h1 className="mb-5 text-4xl leading-none tracking-[-0.06em] motion-safe:animate-enter md:text-5xl">
          Contact
        </h1>
        <p className="mb-7 text-sm leading-[1.7] text-muted motion-safe:animate-enter motion-safe:[animation-delay:120ms]">
          Have a film in mind, a question, or an opinion about movie snacks? We’re listening.
        </p>
        <form onSubmit={openEmailDraft} className="grid gap-5.5">
          <label className={`${label} motion-safe:[animation-delay:180ms]`}>
            Your name
            <input
              className={field}
              name="name"
              autoComplete="name"
              placeholder="The name on the reservation"
              required
            />
          </label>
          <label className={`${label} motion-safe:[animation-delay:280ms]`}>
            Email address
            <input
              className={field}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@somewhere.com"
              required
            />
          </label>
          <label className={`${label} motion-safe:[animation-delay:380ms]`}>
            What’s on your mind?
            <textarea
              className={`${field} resize-y`}
              name="message"
              rows={3}
              placeholder="Tell us the scene…"
              required
            />
          </label>
          <button
            className={`${solidButton} justify-self-start motion-safe:animate-enter motion-safe:[animation-delay:500ms]`}
            type="submit"
          >
            Open email draft
          </button>
        </form>
      </div>
    </section>
  )
}
