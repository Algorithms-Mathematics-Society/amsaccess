import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { DocsNavigation } from "./DocsNavigation";
import { guides } from "./guides";
import styles from "./docs.module.css";

export default function DocsLayout({ children }: { children: ReactNode }) {
  const navigation = guides.map(({ slug, title, audience }) => ({
    slug,
    title,
    audience,
  }));
  return (
    <>
      <MarketingHeader />
      <div className={styles.docs}>
        <a href="#docs-content" className={styles.skipLink}>
          Skip to documentation
        </a>
        <div className={styles.frame}>
          <aside className={styles.desktopSidebar}>
            <DocsNavigation guides={navigation} />
          </aside>
          <div className={styles.contentColumn}>
            <details className={styles.mobileNavigation}>
              <summary>
                Browse documentation <span aria-hidden="true">+</span>
              </summary>
              <DocsNavigation guides={navigation} mobile />
            </details>
            <main id="docs-content" tabIndex={-1}>
              {children}
            </main>
          </div>
        </div>
      </div>
      <MarketingFooter />
    </>
  );
}
