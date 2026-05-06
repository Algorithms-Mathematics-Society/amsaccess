type MarkdownPreviewProps = {
  value: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="my-3 max-h-72 rounded border border-white/10" />')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1 py-0.5">$1</code>');
}

function renderMarkdown(value: string) {
  const lines = escapeHtml(value || "Nothing to preview yet.").split("\n");
  const html: string[] = [];
  let inCode = false;
  let listOpen = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push(inCode ? "</code></pre>" : '<pre class="my-3 overflow-auto rounded border border-white/10 bg-black/40 p-3"><code>');
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      html.push(`${line}\n`);
      continue;
    }

    if (!line.trim()) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      continue;
    }

    if (line.startsWith("### ")) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!listOpen) {
        html.push('<ul class="my-3 list-disc space-y-1 pl-5">');
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }

    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  if (listOpen) html.push("</ul>");
  if (inCode) html.push("</code></pre>");

  return html.join("\n");
}

export function MarkdownPreview({ value }: MarkdownPreviewProps) {
  return (
    <div
      className="markdown-preview rounded border border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-white/75"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
    />
  );
}
