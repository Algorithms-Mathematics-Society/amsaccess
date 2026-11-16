/** Diagnostics for mocked browser suites; preserve every error for their assertions. */
export function recordPageErrors(page, errors) {
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(
      "BROWSER_PAGE_ERROR",
      page.url(),
      error.stack ?? error.message,
    );
    void page
      .evaluate(() => ({
        url: location.href,
        readyState: document.readyState,
        head: document.head.innerHTML.slice(0, 12000),
      }))
      .then((details) =>
        console.error("BROWSER_ERROR_DOCUMENT", JSON.stringify(details)),
      )
      .catch((error) =>
        console.error("BROWSER_ERROR_DOCUMENT_UNAVAILABLE", error.message),
      );
  });
  page.on("console", (message) => {
    if (message.type() === "error")
      console.error("BROWSER_CONSOLE_ERROR", page.url(), message.text());
  });
}
