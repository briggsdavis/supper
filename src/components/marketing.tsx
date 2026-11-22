import { useEffect, useRef, type ReactNode } from "react"
import { Link } from "react-router"

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      element.classList.remove("supper-reveal-pending")
      observer.disconnect()
    }, { threshold: 0.12 })
    element.classList.add("supper-reveal-pending")
    observer.observe(element)
    return () => {
      observer.disconnect()
      element.classList.remove("supper-reveal-pending")
    }
  }, [])

  return <div ref={ref} className={`supper-reveal ${className}`}>{children}</div>
}

export function Disc({ followPointer = false }: { followPointer?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const disc = ref.current
    if (!disc || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let frame = 0
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { left, top, width, height } = disc.getBoundingClientRect()
        const x = (event.clientX - left - width / 2) / window.innerWidth
        const y = (event.clientY - top - height / 2) / window.innerHeight
        disc.style.setProperty("--tilt-x", `${Math.max(-12, Math.min(12, -20 * y))}deg`)
        disc.style.setProperty("--tilt-y", `${Math.max(-12, Math.min(12, 20 * x))}deg`)
      })
    }
    const updateScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        disc.style.setProperty("--disc-spin", `${window.scrollY * 0.12 % 360}deg`)
      })
    }
    if (followPointer) window.addEventListener("pointermove", trackPointer, { passive: true })
    else {
      window.addEventListener("scroll", updateScroll, { passive: true })
      updateScroll()
    }
    return () => {
      window.removeEventListener("pointermove", trackPointer)
      window.removeEventListener("scroll", updateScroll)
      cancelAnimationFrame(frame)
    }
  }, [followPointer])

  return <div ref={ref} className="supper-disc" aria-hidden="true"><span /></div>
}

export function Arrow() {
  return <span className="supper-arrow" aria-hidden="true">↗</span>
}

export function Brand() {
  return (
    <Link className="supper-brand" to="/" viewTransition>
      <span className="supper-brand-disc" aria-hidden="true" />
      <span>Scenes &amp; Supper<span className="supper-brand-period">.</span></span>
    </Link>
  )
}

export function SiteFooter() {
  return (
    <footer className="supper-footer supper-section">
      <Disc followPointer />
      <Reveal className="supper-footer-main">
        <h2>Make tonight<br /> a <em>little</em> more cinematic.</h2>
        <Link to="/contact" className="supper-button" viewTransition>
          Let’s plan a night <Arrow />
        </Link>
      </Reveal>
      <div className="supper-footer-meta">
        <Brand />
        <span>MAKE TONIGHT A CINEMA.</span>
        <a href="https://socialsatisfaction.agency" target="_blank" rel="noreferrer">
          Made by Social Satisfaction <Arrow />
        </a>
      </div>
    </footer>
  )
}
