"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Light and dark for the public pages.
 *
 * The class goes on the `.ac-theme` wrapper, not `<html>`, because the org
 * portal and the contest room have their own palettes and a root class
 * would repaint both.
 *
 * The choice is remembered, and the system preference is only the starting
 * point. Somebody who picked light on a machine set to dark meant it.
 *
 * Renders a fixed-size placeholder until mounted. localStorage is not
 * readable during the server render, so the icon would otherwise swap on
 * hydration and shift the row beside it.
 */

const KEY = "ams-access-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let initial = false;
    try {
      const saved = localStorage.getItem(KEY);
      initial =
        saved === "dark" ||
        (saved === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch {
      // Private mode, or storage blocked. Light is the safe default: this
      // palette was designed light first.
    }
    setDark(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.querySelectorAll(".ac-theme").forEach((node) => {
      node.classList.toggle("dark", dark);
    });
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {
      // Not being able to remember it is not a reason to refuse the change.
    }
  }, [dark, mounted]);

  if (!mounted) return <span className="block h-9 w-9" aria-hidden />;

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-control text-[#fffcf5]/85 transition-colors hover:bg-[#352748] hover:text-[#fffcf5]"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/**
 * Sets the class before first paint, so a dark-mode visitor never sees a
 * white flash. Inlined in the marketing layout; it must run before the
 * body renders, which rules out doing it in an effect.
 */
export const THEME_BOOTSTRAP = `(function(){try{
var k=localStorage.getItem(${JSON.stringify(KEY)});
var d=k==="dark"||(k===null&&window.matchMedia("(prefers-color-scheme: dark)").matches);
if(d)document.documentElement.classList.add("ac-dark-pending");
}catch(e){}})();`;
