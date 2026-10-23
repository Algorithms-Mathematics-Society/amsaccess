/** Protect this editor's unsaved text before Next's delegated link handler runs. */
export function guardReferenceSheetNavigation(
  event: MouseEvent,
  currentUrl: string,
  confirmLeave: () => boolean,
): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(event.target instanceof Element)
  )
    return;
  const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
  if (
    !anchor ||
    anchor.hasAttribute("download") ||
    (anchor.target && anchor.target !== "_self")
  )
    return;
  const current = new URL(currentUrl);
  const destination = new URL(anchor.href, current);
  // Hash changes keep the editor mounted. External navigations are covered by beforeunload.
  if (
    destination.origin !== current.origin ||
    (destination.pathname === current.pathname &&
      destination.search === current.search)
  )
    return;
  if (!confirmLeave()) {
    event.preventDefault();
    event.stopPropagation();
  }
}
