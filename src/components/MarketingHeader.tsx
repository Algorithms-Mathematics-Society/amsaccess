"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { ACCESS_APP_URL } from "@/lib/product-links";
import styles from "./MarketingHeader.module.css";

const productLinks = [
  {
    label: "Product overview",
    description: "Assessment setup, candidate tools, and review.",
    href: "/product",
  },
  {
    label: "Assessment setup",
    description: "Questions, instructions, and invitations.",
    href: "/product#organize",
  },
  {
    label: "Desktop app",
    description: "Available on Windows, macOS, and Linux.",
    href: ACCESS_APP_URL,
  },
];
const resourceLinks = [
  {
    label: "About AMS",
    description: "The company behind Access, Derive and Ascent.",
    href: "/about",
  },
  {
    label: "Security & privacy",
    description: "Permissions, assessment controls, and data handling.",
    href: "/security",
  },
  {
    label: "Documentation",
    description: "Guides for candidates, organizers, and reviewers.",
    href: "/docs",
  },
  {
    label: "Release notes",
    description: "Published changes to Access.",
    href: "/changelog",
  },
  {
    label: "Contact us",
    description: "Assessment enquiries and product help.",
    href: "/contact",
  },
];
type MenuName = "product" | "resources" | "mobile";

function currentPage(pathname: string, href: string) {
  return (
    !href.includes("#") &&
    (pathname === href || pathname.startsWith(`${href}/`))
  );
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuName | null>(null);
  const header = useRef<HTMLElement>(null);
  const triggers = useRef<Partial<Record<MenuName, HTMLButtonElement | null>>>(
    {},
  );
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHover = useRef<MenuName | null>(null);
  const cancelHover = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);
  const close = useCallback(() => {
    cancelHover();
    openedByHover.current = null;
    setOpen(null);
  }, [cancelHover]);

  function toggleMenu(name: MenuName) {
    cancelHover();
    const wasHovered = openedByHover.current === name;
    openedByHover.current = null;
    // Clicking an already hovered trigger confirms it instead of instantly
    // hiding the panel the visitor just moved toward.
    setOpen((value) => (value === name && !wasHovered ? null : name));
  }

  function enterMenu(name: "product" | "resources", event: ReactPointerEvent) {
    // Use the actual pointer so a mouse also works on hybrid touch devices.
    if (event.pointerType !== "mouse") return;
    cancelHover();
    if (open === name) return;
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      openedByHover.current = name;
      setOpen(name);
    }, 100);
  }

  function leaveMenu(name: "product" | "resources", event: ReactPointerEvent) {
    if (event.pointerType !== "mouse") return;
    cancelHover();
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      // Pointer departure must not dismiss a panel being used by keyboard.
      if (
        document
          .querySelector(`#access-nav-${name}`)
          ?.contains(document.activeElement)
      )
        return;
      if (openedByHover.current === name) openedByHover.current = null;
      setOpen((value) => (value === name ? null : value));
    }, 200);
  }

  useEffect(() => close(), [pathname, close]);
  useEffect(() => cancelHover, [cancelHover]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (open || hoverTimer.current !== null)) {
        event.preventDefault();
        if (open) triggers.current[open]?.focus();
        close();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  function focusMenu(name: MenuName) {
    cancelHover();
    openedByHover.current = null;
    setOpen(name);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#access-nav-${name} a`)?.focus();
    });
  }

  const trigger = (name: "product" | "resources", label: string) => (
    <button
      ref={(node) => {
        triggers.current[name] = node;
      }}
      type="button"
      className={styles.navLink}
      aria-expanded={open === name}
      aria-controls={`access-nav-${name}`}
      data-active={
        name === "product"
          ? pathname === "/product" ||
            pathname === "/controlled-round" ||
            pathname === "/download"
          : resourceLinks.some((link) => currentPage(pathname, link.href)) ||
            pathname === "/privacy" ||
            pathname === "/terms"
      }
      onClick={() => toggleMenu(name)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          cancelHover();
          openedByHover.current = null;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusMenu(name);
        }
      }}
    >
      {label}
      <ChevronDown size={12} aria-hidden="true" className={styles.chevron} />
    </button>
  );

  const menuLinks = (items: typeof productLinks) =>
    items.map(({ label, description, href }) => (
      <Link
        key={href}
        href={href}
        className={styles.menuLink}
        aria-current={currentPage(pathname, href) ? "page" : undefined}
        onClick={close}
      >
        <span className={styles.menuText}>
          <span className={styles.menuTitle}>{label}</span>
          <span className={styles.menuDescription}>{description}</span>
        </span>
      </Link>
    ));

  return (
    <header
      ref={header}
      className={styles.header}
      data-access-theme
      data-access-navbar
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          close();
      }}
    >
      <div className={styles.bar}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="Access by AMS home"
          onClick={close}
        >
          <svg
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className={styles.brandMark}
          >
            <path
              d="M3 28 16 4 29 28"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.brandName}>
            Access<span className={styles.brandByline}>by AMS</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className={styles.desktopNav}>
          <div
            className={styles.dropdown}
            onPointerEnter={(event) => enterMenu("product", event)}
            onPointerLeave={(event) => leaveMenu("product", event)}
            onFocusCapture={cancelHover}
          >
            {trigger("product", "Product")}
            <div
              id="access-nav-product"
              className={styles.panel}
              hidden={open !== "product"}
            >
              <div className={styles.menuLinks}>{menuLinks(productLinks)}</div>
            </div>
          </div>
          <Link href="/#use-cases" className={styles.navLink} onClick={close}>
            Use cases
          </Link>
          <Link
            href="/pricing"
            className={styles.navLink}
            aria-current={pathname === "/pricing" ? "page" : undefined}
            onClick={close}
          >
            Pricing
          </Link>
          <div
            className={styles.dropdown}
            onPointerEnter={(event) => enterMenu("resources", event)}
            onPointerLeave={(event) => leaveMenu("resources", event)}
            onFocusCapture={cancelHover}
          >
            {trigger("resources", "Resources")}
            <div
              id="access-nav-resources"
              className={`${styles.panel} ${styles.resourcesPanel}`}
              hidden={open !== "resources"}
            >
              <div className={styles.menuLinks}>{menuLinks(resourceLinks)}</div>
            </div>
          </div>
        </nav>

        <div className={styles.actions}>
          <Link
            href="/contact"
            className={`${styles.navLink} ${styles.contactLink}`}
            aria-current={pathname === "/contact" ? "page" : undefined}
            onClick={close}
          >
            Contact
          </Link>
          <Link
            href={ACCESS_APP_URL}
            className={styles.appLink}
            onClick={close}
          >
            <span>Open Access</span>
            <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
          </Link>
          <button
            ref={(node) => {
              triggers.current.mobile = node;
            }}
            type="button"
            className={`${styles.iconButton} ${styles.mobileToggle}`}
            aria-label={
              open === "mobile" ? "Close navigation" : "Open navigation"
            }
            aria-expanded={open === "mobile"}
            aria-controls="access-nav-mobile"
            onClick={() => toggleMenu("mobile")}
          >
            {open === "mobile" ? (
              <X size={21} strokeWidth={1.6} aria-hidden="true" />
            ) : (
              <Menu size={21} strokeWidth={1.6} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <nav
        id="access-nav-mobile"
        aria-label="Mobile navigation"
        className={styles.mobilePanel}
        hidden={open !== "mobile"}
      >
        <div className={styles.mobileQuickLinks}>
          <Link href="/#use-cases" className={styles.navLink} onClick={close}>
            Use cases
          </Link>
          <Link
            href="/pricing"
            className={styles.navLink}
            aria-current={pathname === "/pricing" ? "page" : undefined}
            onClick={close}
          >
            Pricing
          </Link>
        </div>
        <div className={styles.mobileGroups}>
          <section aria-label="Product">
            <p className={styles.eyebrow}>PRODUCT</p>
            {menuLinks(productLinks)}
          </section>
          <section aria-label="Resources">
            <p className={styles.eyebrow}>RESOURCES</p>
            {menuLinks(resourceLinks)}
          </section>
        </div>
        <Link
          href={ACCESS_APP_URL}
          className={styles.mobileSignIn}
          onClick={close}
        >
          Sign in to your workspace{" "}
          <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
