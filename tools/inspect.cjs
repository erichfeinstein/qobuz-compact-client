const { chromium } = require('playwright-core');

async function inspect() {
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 5000 });
    const page = browser.contexts().flatMap(context => context.pages()).find(page => {
      try { return new URL(page.url()).origin === 'https://play.qobuz.com'; }
      catch { return false; }
    });
    if (!page) throw new Error('Open Qobuz in debug mode before inspecting.');
    page.setDefaultTimeout(5000);
    console.log(await page.locator('.NavBar').evaluate(element => ({
      navbar: getComputedStyle(element).backgroundColor,
      navbarRect: element.getBoundingClientRect().toJSON(),
      search: element.querySelector('.SearchBar') && getComputedStyle(element.querySelector('.SearchBar')).backgroundColor,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
    })));
  } finally {
    if (browser) await browser.close();
  }
}
inspect().catch(error => { console.error(error.message); process.exitCode = 1; });
