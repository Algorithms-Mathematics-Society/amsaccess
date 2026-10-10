"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * The AMS public-page kit.
 *
 * One vocabulary, taken from the mark: a violet gradient held back to
 * pastel and warmed slightly, with a serif display and squared geometry.
 * Every colour is a CSS variable, so the dark theme is the same names with
 * different values and nothing here branches on it.
 *
 * Nothing here is generic. There is one button with three variants, one
 * easing, one container width, because the alternative is six of each and
 * a page that looks assembled rather than designed.
 */

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12 xl:px-16 ${className}`}>{children}</div>;
}

/** Small caps label above a heading. One per section, never stacked. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-body text-xs font-semibold uppercase tracking-[0.18em] text-violet">
      {children}
    </span>
  );
}

type ButtonVariant = "solid" | "outline" | "inverse";

export function AmsButton({
  href,
  children,
  variant = "solid",
  className = "",
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  onClick?: () => void;
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 py-2.5 " +
    "font-body text-sm font-semibold no-underline transition-all duration-200 active:translate-y-px active:scale-[0.99] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const styles: Record<ButtonVariant, string> = {
    solid: "bg-violet text-white hover:bg-violet-deep focus-visible:outline-violet",
    outline:
      "border border-line text-ink hover:border-violet hover:bg-violet-soft focus-visible:outline-violet",
    inverse: "bg-paper text-violet-deep hover:bg-surface focus-visible:outline-orchid",
  };
  const cls = `${base} ${styles[variant]} ${className}`;

  if (!href) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    );
  }
  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} onClick={onClick}>
      {children}
    </Link>
  );
}

/**
 * Scroll reveal, with the one easing.
 *
 * Content is visible from the start and only animated once observed, so a
 * reader with JavaScript off or a crawler sees the whole page. An opacity-0
 * default would hide it from both, which is the usual way this component is
 * got wrong.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-reveal ${
        shown ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-3"
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}

/** A section heading. Serif, because that is the AMS voice. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 font-display text-[clamp(1.9rem,2.8vw+0.75rem,3.1rem)] leading-[1.08] text-ink">
        {title}
      </h2>
      {lead && <p className="mt-4 font-body text-base leading-7 text-muted">{lead}</p>}
    </div>
  );
}

/** A bordered surface. Squared off, because the brand is not rounded. */
export function Plate({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-panel border border-line bg-surface transition-colors duration-200 hover:border-violet/35 ${className}`}>
      {children}
    </div>
  );
}
