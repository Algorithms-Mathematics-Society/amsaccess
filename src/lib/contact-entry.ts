/** Public navigation hints only: never carry candidate details in a URL. */
export type ContactTopic = "Sales" | "Support" | "Security";

export function contactEntry(
  params: Record<string, string | string[] | undefined>,
): { category: ContactTopic; signInHelp: boolean } {
  const category =
    params.topic === "Sales" || params.topic === "Support" || params.topic === "Security"
      ? params.topic
      : params.topic === undefined && params.source === "access-login"
        ? "Support"
        : "Sales";
  return {
    category,
    signInHelp: category === "Support" && params.source === "access-login",
  };
}
