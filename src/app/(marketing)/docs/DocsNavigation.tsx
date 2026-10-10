"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ACCESS_DOWNLOAD_URL, ORGANIZER_SIGN_IN_URL } from "@/lib/product-links";
import type { Audience } from "./guides";
import styles from "./docs.module.css";

type NavigationGuide = { slug: string; title: string; audience: Audience };
const groups: { value: Audience; label: string }[] = [
  { value: "everyone", label: "Start here" },
  { value: "candidates", label: "For candidates" },
  { value: "organizers", label: "For organizers" },
  { value: "reviewers", label: "For reviewers" },
];
export function DocsNavigation({
  guides,
  mobile = false,
}: {
  guides: NavigationGuide[];
  mobile?: boolean;
}) {
  const pathname = usePathname();
  function closeMenu(event: React.MouseEvent<HTMLAnchorElement>) {
    const details = event.currentTarget.closest("details");
    if (details) {
      details.open = false;
      details.querySelector("summary")?.focus();
    }
  }
  return (
    <nav
      className={styles.docNav}
      aria-label={mobile ? "Mobile documentation" : "Documentation"}
    >
      <Link
        href="/docs"
        className={styles.navHome}
        aria-current={pathname === "/docs" ? "page" : undefined}
        onClick={closeMenu}
      >
        <BookOpen size={17} aria-hidden="true" />
        Access guides
      </Link>
      {groups.map((group) => (
        <div key={group.value} className={styles.navGroup}>
          <p>{group.label}</p>
          <ul>
            {guides
              .filter((guide) => guide.audience === group.value)
              .map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={"/docs/" + guide.slug}
                    aria-current={
                      pathname === "/docs/" + guide.slug ? "page" : undefined
                    }
                    onClick={closeMenu}
                  >
                    {guide.title}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <div className={styles.navHelp}>
        <p>Already using Access?</p>
        <a href={ORGANIZER_SIGN_IN_URL}>
          Organizer sign in <ArrowUpRight size={13} aria-hidden="true" />
        </a>
        <a href={ACCESS_DOWNLOAD_URL}>
          Download Access <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}
