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

    const observeElements = (root: ParentNode = document) => {
      root.querySelectorAll(".animate-fade-in-up").forEach((el) => {
        observer.observe(el);
      });
    };

    observeElements();

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.classList.contains("animate-fade-in-up")) {
            observer.observe(node);
          }
          observeElements(node);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        observeElements();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
