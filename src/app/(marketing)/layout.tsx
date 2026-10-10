import type { ReactNode } from "react";
import "@/styles/access-theme.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      id="page-top"
      tabIndex={-1}
      className="light"
      data-access-marketing
      data-access-theme
    >
      {children}
    </div>
  );
}
