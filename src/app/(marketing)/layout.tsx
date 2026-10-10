import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/access-theme.css";

// Public pages supply their own complete title; avoid appending the app shell brand twice.
export const metadata: Metadata = {
  title: { default: "Access by AMS", template: "%s" },
};

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
