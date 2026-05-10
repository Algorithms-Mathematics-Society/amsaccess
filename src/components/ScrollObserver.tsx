"use client";

import { useEffect } from "react";

export function ScrollObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up-trigger");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const observeElements = () => {
      document.querySelectorAll(".animate-fade-in-up").forEach((el) => {
        observer.observe(el);
      });
    };

    observeElements();

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        observeElements();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
