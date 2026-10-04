const { chromium } = require("playwright-core");

async function inspect() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const page = browser.contexts()
    .flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes("qobuz.com"));

  if (!page) throw new Error("Qobuz is not available through the local debug endpoint.");

  const navbar = await page.locator(".NavBar").evaluate((element) => {
    const active = element.querySelector(".ui-block-nav-item.cursor-default");
    const search = element.querySelector(".SearchBar");
    return {
      navbar: getComputedStyle(element).backgroundColor,
      navbarRect: element.getBoundingClientRect().toJSON(),
      navbarParents: [element.parentElement, element.parentElement?.parentElement]
        .filter(Boolean)
        .map((parent) => ({
          classes: parent.className,
          background: getComputedStyle(parent).backgroundColor,
          padding: getComputedStyle(parent).padding,
        })),
      active: active && getComputedStyle(active).backgroundColor,
      activeShadow: active && getComputedStyle(active).boxShadow,
      search: search && getComputedStyle(search).backgroundColor,
      documentBackground: getComputedStyle(document.documentElement).backgroundColor,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      largeLightSurfaces: [...document.querySelectorAll("*")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const color = getComputedStyle(element).backgroundColor;
          return rect.width > 800 && rect.height > 400 && color.startsWith("rgb(255");
        })
        .slice(0, 10)
        .map((element) => ({ classes: element.className, tag: element.tagName })),
      qualityLabels: [...document.querySelectorAll("[class*='quality' i], [class*='hires' i]")]
        .map((element) => element.className)
        .filter(Boolean),
      surfaces: document.elementsFromPoint(1160, 500).slice(0, 8).map((element) => ({
        classes: element.className,
        background: getComputedStyle(element).backgroundColor,
      })),
    };
  });

  // Inspect computed styles only. Never capture or save screenshots.
  console.log(JSON.stringify(navbar, null, 2));
  await browser.close();
}

inspect().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
