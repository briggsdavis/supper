import type { FormEvent } from "react"
import { Arrow, Disc } from "../components/marketing.tsx"

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
    <section className="supper-contact">
      <Disc />
      <div className="supper-contact-content">
        <h1>Contact</h1>
        <p>Have a film in mind, a question, or an opinion about movie snacks? We’re listening.</p>
        <form onSubmit={openEmailDraft}>
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              placeholder="The name on the reservation"
              required
            />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@somewhere.com"
              required
            />
          </label>
          <label>
            What’s on your mind?
            <textarea name="message" rows={3} placeholder="Tell us the scene…" required />
          </label>
          <button className="supper-button supper-button-solid" type="submit">
            Open email draft <Arrow />
          </button>
        </form>
      </div>
    </section>
  )
}
