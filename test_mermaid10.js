const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.exposeFunction('logSVG', text => console.log('SVG:', text.substring(0, 1000)));

  await page.goto('http://localhost:8000');

  // Inject script to intercept mermaid.render
  await page.evaluate(() => {
    const originalRender = window.mermaid.render;
    window.mermaid.render = async function(id, text) {
      const result = await originalRender.call(window.mermaid, id, text);
      window.logSVG(result.svg);
      return result;
    };
  });

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  await browser.close();
})();
