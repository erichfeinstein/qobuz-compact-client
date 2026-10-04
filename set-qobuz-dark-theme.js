const { chromium } = require("playwright-core");

async function setDarkTheme() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const page = browser.contexts()
    .flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes("qobuz.com"));

  if (!page) throw new Error("Qobuz is not available through the local debug endpoint.");

  await page.locator(".NavBar__avatar").evaluate((button) => button.click());
  await page.waitForTimeout(300);
  const darkButton = page.locator(".NavBarMenu__appearanceMode.icon-brightness");
  await darkButton.waitFor({ state: "attached", timeout: 2_000 });
  await darkButton.evaluate((button) => button.click());
  await page.waitForTimeout(500);
  await browser.close();
}

setDarkTheme().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
