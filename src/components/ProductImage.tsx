"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Expand, X, ZoomIn, ZoomOut } from "lucide-react";
import styles from "./ProductImage.module.css";

type ProductImageProps = {
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: string;
  sizes: string;
  priority?: boolean;
};

export function ProductImage({
  src, width, height, alt, title, caption, sizes, priority = false,
}: ProductImageProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  return (
    <div className={styles.media} data-product-image>
      <button
        type="button"
        className={styles.trigger}
        aria-label={"Enlarge " + title.toLowerCase()}
        aria-haspopup="dialog"
        onClick={() => {
          setZoomed(false);
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          quality={90}
          className={styles.image}
        />
        <span className={styles.imageAction}>
          <span>Desktop app · Example data</span>
          <span><Expand size={14} aria-hidden="true" /> View larger</span>
        </span>
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={hintId}
        onClose={() => { setOpen(false); setZoomed(false); }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [tabindex="0"]',
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) {
            dialog.current?.close();
          }
        }}
      >
        <div className={styles.dialogHeader}>
          <h2 id={titleId}>{title}</h2>
          <div className={styles.controls}>
            <button
              type="button"
              aria-pressed={zoomed}
              onClick={() => {
                setZoomed(!zoomed);
                viewport.current?.scrollTo({ top: 0, left: 0 });
              }}
            >
              {zoomed ? <ZoomOut size={17} aria-hidden="true" /> : <ZoomIn size={17} aria-hidden="true" />}
              <span>{zoomed ? "Fit image" : "Zoom in"}</span>
            </button>
            <button type="button" autoFocus aria-label="Close screenshot" onClick={() => dialog.current?.close()}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p id={hintId} className={styles.hint}>
          {zoomed ? "Scroll across and down to explore the details." : "Zoom in to read the interface details."}
        </p>
        <div ref={viewport} className={styles.viewer} data-zoomed={zoomed} tabIndex={0} role="region" aria-label="Screenshot detail">
          {open && (
            // Load the original only after opening; keep the full-resolution image
            // available for zooming without adding it to initial page downloads.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              width={width}
              height={height}
              alt={alt}
              className={styles.expandedImage}
              style={zoomed ? { width: Math.max(width / 2, 960), maxWidth: "none" } : undefined}
            />
          )}
        </div>
        <p className={styles.dialogCaption}>{caption} Example data.</p>
      </dialog>
    </div>
  );
}
