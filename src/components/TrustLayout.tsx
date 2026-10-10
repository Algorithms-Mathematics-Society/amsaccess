import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import styles from "./TrustPages.module.css";

export type TrustRoute = "security" | "privacy" | "terms";
const links = [
  { id: "security", label: "Security & privacy", href: "/security" },
  { id: "privacy", label: "Privacy notice", href: "/privacy" },
  { id: "terms", label: "Terms of use", href: "/terms" },
];
export function TrustLayout({
  active,
  children,
}: {
  active: TrustRoute;
  children: ReactNode;
}) {
  return (
    <>
      <MarketingHeader />
      <main
        className={styles.trust}
        id="trust-content"
        tabIndex={-1}
        data-trust-page={active}
      >
        <div className={styles.container}>
          <div className={styles.trustBar}>
            <span>
              <ShieldCheck size={17} strokeWidth={1.5} aria-hidden="true" />
              Access / Trust & information
            </span>
            <nav aria-label="Security and legal pages">
              {links.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  aria-current={active === link.id ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          {children}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
