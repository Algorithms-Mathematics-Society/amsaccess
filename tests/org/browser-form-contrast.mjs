import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
try {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "ams_session",
      value: `test.${Math.floor(Date.now() / 1000) + 3600}.test`,
      url: base,
    },
  ]);
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    assert.equal(
      route.request().method(),
      "GET",
      "contrast check never writes",
    );
    const data =
      url.pathname === "/api/auth/me"
        ? { role: "admin" }
        : url.pathname.endsWith("/facets")
          ? { total: 0, colleges: [], branches: [], graduation_years: [] }
          : [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto(`${base}/org/participants`);
  const search = page.locator("input[placeholder]").first();
  await search.waitFor();
  assert.equal(
    await search.evaluate((el) => getComputedStyle(el).borderTopColor),
    "rgb(133, 133, 133)",
  );
  await search.focus();
  assert.equal(
    await search.evaluate((el) => getComputedStyle(el).borderTopColor),
    "rgb(15, 23, 42)",
    "keyboard focus retains its stronger border",
  );
  await search.blur();

  // Exercise every neutral surface and control type with the shipped stylesheet.
  const results = await page.evaluate(() => {
    const fixture = document.createElement("section");
    fixture.innerHTML = `<div data-org-theme>
      ${["bg-white", "bg-slate-50", "bg-slate-100"]
        .map(
          (bg) => `<div class="${bg}">
        <input class="border border-slate-200 ${bg}" aria-label="Input ${bg}">
        <select class="border border-slate-300 ${bg}" aria-label="Select ${bg}"><option>Choice</option></select>
        <textarea class="border border-slate-200 ${bg} focus:border-violet-500" aria-label="Textarea ${bg}"></textarea>
        <input type="file" class="file:border file:border-slate-300 file:bg-white" aria-label="File ${bg}">
      </div>`,
        )
        .join("")}
      <div id="decorative" class="border border-slate-200"></div>
      <button class="border border-slate-300">Ordinary button</button>
      <input type="checkbox" aria-label="Native checkbox">
      <input id="semantic" class="border border-red-300" aria-label="Semantic error">
    </div><input id="outside" class="border border-slate-300" aria-label="Outside organizer">`;
    document.body.append(fixture);
    const colors = [
      ...fixture.querySelectorAll(
        "input:not([type]), select, textarea, input[type=file]",
      ),
    ]
      .filter((el) => !el.id)
      .map((el) => {
        const style = getComputedStyle(
          el,
          el.type === "file" ? "::file-selector-button" : null,
        );
        return {
          border: style.borderTopColor,
          background: style.backgroundColor,
          adjacent: getComputedStyle(el.parentElement).backgroundColor,
        };
      });
    const border = (selector) =>
      getComputedStyle(fixture.querySelector(selector)).borderTopColor;
    const unchanged = [
      border("#decorative"),
      border("button"),
      border("#semantic"),
      border("#outside"),
    ];
    const textarea = fixture.querySelector("textarea");
    textarea.focus();
    const focused = getComputedStyle(textarea).borderTopColor;
    fixture.remove();
    return { colors, unchanged, focused };
  });
  const luminance = (color) => {
    const rgb = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((v) => {
        const n = v / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const { border, background, adjacent } of results.colors) {
    for (const surface of [background, adjacent]) {
      const a = luminance(border),
        b = luminance(surface);
      const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert(
        contrast >= 3,
        `${border} against ${surface}: ${contrast.toFixed(2)}:1`,
      );
    }
  }
  assert.deepEqual(results.unchanged, [
    "rgb(222, 222, 222)",
    "rgb(222, 222, 222)",
    "rgb(252, 165, 165)",
    "rgb(203, 213, 225)",
  ]);
  assert.equal(results.focused, "rgb(139, 92, 246)");
  console.log(
    "PASS: form borders meet 3:1; decorative, semantic, outside and focus borders preserved",
  );
} finally {
  await browser.close();
}
