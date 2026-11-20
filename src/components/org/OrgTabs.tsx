"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useEdgeMask } from "@/lib/client/useEdgeMask";

function reveal(strip: HTMLElement, tab: HTMLElement) {
  const bounds = strip.getBoundingClientRect();
  const item = tab.getBoundingClientRect();
  if (item.left < bounds.left || item.right > bounds.right) {
    strip.scrollLeft +=
      item.left - bounds.left + (item.width - bounds.width) / 2;
  }
}

export function OrgTabs<T extends string>({
  id,
  label,
  tabs,
  active,
  onSelect,
  onIntent,
  className = "gap-1",
  tabClassName = "px-4",
  children,
}: {
  id: string;
  label: string;
  tabs: readonly T[];
  active: T;
  onSelect: (value: T) => void;
  onIntent?: (value: T) => void;
  className?: string;
  tabClassName?: string;
  children: (value: T) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<T | null>(null);
  const mask = useEdgeMask(ref);

  useEffect(() => {
    const strip = ref.current;
    const selected = strip?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    if (!strip || !selected) return;
    const resize = new ResizeObserver(() => {
      const tab = strip.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : selected;
      reveal(strip, tab);
    });
    resize.observe(strip);
    for (const tab of strip.children) resize.observe(tab);
    reveal(strip, selected);
    return () => resize.disconnect();
  }, [active, tabs.length]);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = (index - 1 + tabs.length) % tabs.length;
        break;
      case "ArrowRight":
        next = (index + 1) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    const strip = ref.current;
    const tab = strip?.children[next] as HTMLButtonElement | undefined;
    if (!strip || !tab) return;
    event.preventDefault();
    tab.focus({ preventScroll: true });
    reveal(strip, tab);
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={label}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(null);
      }}
      className={`flex min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={mask}
    >
      {tabs.map((value, index) => (
        <button
          key={value}
          id={`${id}-tab-${value}`}
          type="button"
          role="tab"
          aria-selected={active === value}
          aria-controls={`${id}-panel-${value}`}
          tabIndex={(focused ?? active) === value ? 0 : -1}
          onPointerEnter={() => onIntent?.(value)}
          onFocus={() => {
            setFocused(value);
            onIntent?.(value);
          }}
          onKeyDown={(event) => moveFocus(event, index)}
          onClick={() => onSelect(value)}
          className={`relative min-h-11 shrink-0 whitespace-nowrap border-b-2 py-2 text-sm font-medium transition focus-visible:-outline-offset-2 ${tabClassName} ${
            active === value
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          {children(value)}
        </button>
      ))}
    </div>
  );
}

export function OrgTabPanel({
  id,
  value,
  active,
  children,
  className,
}: {
  id: string;
  value: string;
  active: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={`${id}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${id}-tab-${value}`}
      hidden={active !== value}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
