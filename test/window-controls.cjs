const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withApp } = require('./helpers.cjs');

test('system window controls remain available with the restored Qobuz theme', async () => {
  await withApp(async (_app, page) => {
    await page.locator('.NavBar').waitFor();
    assert.equal(await page.evaluate(() => navigator.windowControlsOverlay.visible), false);
    await page.waitForFunction(() => document.body.classList.contains('theme-dark'));
    const state = await page.evaluate(() => ({
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      navigationDisplay: getComputedStyle(document.querySelector('.NavBar')).display,
    }));
    assert.deepEqual(state, { htmlClasses: 'theme-dark', bodyClasses: 'theme-dark', navigationDisplay: 'flex' });
  });
});

// Losing the nowrap/width rules must make a label escape its pill at small widths.
test('search labels stay inside their pills and results clear the filter panel', async () => {
  await withApp(async (app, page) => {
    await page.waitForFunction(() => document.body.classList.contains('theme-dark'));
    for (const width of [958, 1180, 801, 480]) {
      await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setSize(width, 820), width);
      await page.waitForFunction(width => innerWidth === width, width);
      for (const selected of [false, true]) {
        if (selected) await page.locator('.TagBar__tags:first-child .TagBar__tag').first().click();
        const layout = await page.evaluate(() => {
          const panel = document.querySelector('.TagBar').getBoundingClientRect();
          return {
            panelBottom: panel.bottom,
            clearGap: (() => {
              const clear = document.querySelector('.TagBar__button');
              if (!clear) return null;
              const heading = document.createRange();
              heading.selectNodeContents(document.querySelector('.TagBar__title'));
              return clear.getBoundingClientRect().left - heading.getBoundingClientRect().right;
            })(),
            resultsTop: document.querySelector('.result').getBoundingClientRect().top,
            tags: [...document.querySelectorAll('.TagBar__tags:first-child .TagBar__tag')].map(tag => {
              const box = tag.getBoundingClientRect(), label = tag.querySelector('p').getBoundingClientRect();
              return { height: label.height, top: label.top, bottom: label.bottom, pillTop: box.top, pillBottom: box.bottom, left: box.left, right: box.right };
            }),
            width: innerWidth,
          };
        });
        if (selected) assert.ok(layout.clearGap >= 0, `clear control overlaps heading at ${width}px`);
        assert.ok(layout.resultsTop >= layout.panelBottom, `filter panel overlaps results at ${width}px`);
        for (const tag of layout.tags) {
          assert.ok(tag.height < 24, `label wraps at ${width}px`);
          assert.ok(tag.top >= tag.pillTop && tag.bottom <= tag.pillBottom, `label escapes pill at ${width}px`);
          assert.ok(tag.left >= 0 && tag.right <= layout.width, `pill leaves viewport at ${width}px`);
        }
      }
      await page.locator('.TagBar__tags:first-child .TagBar__tag').first().click();
    }
  });
});

// The old native dragging CSS swallowed pointer events on navbar descendants.
test('page controls are outside window drag regions and close has a usable click area', async () => {
  await withApp(async (_app, page) => {
    await page.waitForFunction(() => document.body.classList.contains('theme-dark'));
    assert.deepEqual(await page.locator('.NavBar, .NavBar *').evaluateAll(elements => elements.map(element => getComputedStyle(element).webkitAppRegion).filter(value => value === 'drag')), []);
    const close = page.locator('.fullsearch-close');
    const box = await close.boundingBox();
    assert.ok(box.width >= 30 && box.height >= 30, 'close hit area is too small');
    await close.click({ position: { x: 3, y: 3 } });
    assert.equal(await page.locator('.fullsearch').isVisible(), false);
  });
});

test('theme and working search filters survive a player reload', async () => {
  await withApp(async (_app, page) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.waitForFunction(() => document.body.classList.contains('theme-dark'));
      const tag = page.locator('.TagBar__tags:first-child .TagBar__tag').first();
      const before = await tag.evaluate(element => getComputedStyle(element).backgroundColor);
      await tag.click();
      assert.ok(await tag.evaluate(element => element.classList.contains('selected')));
      assert.notEqual(await tag.evaluate(element => getComputedStyle(element).backgroundColor), before);
      const track = await page.locator('.fullsearch').evaluate(element => ({
        width: getComputedStyle(element, '::-webkit-scrollbar').width,
        thumb: getComputedStyle(element, '::-webkit-scrollbar-thumb').backgroundColor,
        background: getComputedStyle(element, '::-webkit-scrollbar-track').backgroundColor,
      }));
      assert.equal(track.width, '10px');
      assert.notEqual(track.thumb, track.background);
      if (attempt === 0) await page.reload();
    }
  });
});
