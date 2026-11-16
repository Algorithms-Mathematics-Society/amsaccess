import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
try {
  const page = await browser.newPage();
  const externalFonts = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) {
      if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname))
        externalFonts.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(base, { waitUntil: "networkidle" });
  const result = await page.evaluate(async () => {
    const cases = [
      ["Inter", 100],
      ["Inter", 400],
      ["Inter", 600],
      ["Inter", 900],
      ["Source Serif 4", 400],
      ["Source Serif 4", 600],
    ];
    const loaded = [];
    for (const [family, weight] of cases) {
      const faces = await document.fonts.load(
        `${weight} 20px "${family}"`,
        "AMS Access ΑБ tiếng Việt",
      );
      loaded.push({
        family,
        weight,
        count: faces.length,
        ready: faces.every((face) => face.status === "loaded"),
      });
    }
    const style = getComputedStyle(document.documentElement);
    return {
      loaded,
      inter: style.getPropertyValue("--font-inter").trim(),
      serif: style.getPropertyValue("--font-source-serif").trim(),
      preloads: [
        ...document.querySelectorAll('link[rel="preload"][as="font"]'),
      ].map((link) => new URL(link.href).pathname),
      resources: performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes("/fonts/"))
        .map((entry) => entry.name),
    };
  });
  assert.deepEqual(externalFonts, [], "no Google font requests");
  for (const font of result.loaded)
    assert.ok(font.count > 0 && font.ready, JSON.stringify(font));
  assert.deepEqual(result.inter.split(/,\s*/), ['"Inter"', '"Inter Fallback"']);
  assert.deepEqual(result.serif.split(/,\s*/), [
    '"Source Serif 4"',
    '"Source Serif 4 Fallback"',
  ]);
  assert.equal(
    result.preloads.filter((url) => url.startsWith("/fonts/")).length,
    2,
  );
  assert.ok(result.preloads.some((url) => /\/inter-latin-/.test(url)));
  assert.ok(result.preloads.some((url) => /\/source-serif-4-latin-/.test(url)));
  assert.ok(result.resources.length >= 2);
  console.log(
    "House font weights and multilingual subsets load locally with external requests blocked",
  );
} finally {
  await browser.close();
}
