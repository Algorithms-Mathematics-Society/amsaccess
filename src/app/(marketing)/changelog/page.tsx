import { redirect } from "next/navigation";

/**
 * Release history moved onto the download page.
 *
 * Somebody asking "what changed" is almost always deciding whether to
 * update, and that decision belongs next to the button. Kept as a redirect
 * rather than deleted because the old URL is in sent mail and in the
 * footer of released builds, and a 404 there is a dead end for the exact
 * person trying to keep current.
 */
export default function ChangelogPage() {
  redirect("/download#releases");
}
