import type { FormEvent } from "react"
import { ChromeDisc, solidButton } from "../components/marketing.tsx"

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
      <div className="relative mx-auto grid min-h-[calc(100svh-5.375rem)] max-w-7xl items-center gap-8 px-[max(5vw,1.5rem)] pt-8 pb-14 max-md:min-h-[calc(100svh-6rem)] md:grid-cols-2 lg:gap-14">
        <ChromeDisc
          followPointer
          className="relative w-full max-w-[38rem] justify-self-center max-md:absolute max-md:top-1/2 max-md:-left-[22vw] max-md:-z-1 max-md:w-[min(88vw,34rem)] max-md:-translate-y-1/2 max-md:opacity-30"
        />
        <div className="mx-auto w-full max-w-[36.875rem]">
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
      </div>
    </section>
  )
}
