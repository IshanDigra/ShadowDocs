const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // Find div elements inside mermaid-box (HTML labels might be nested in divs)
  const info = await page.evaluate(() => {
     const boxes = Array.from(document.querySelectorAll('.mermaid-box foreignObject'));
     return boxes.map(b => b.outerHTML).filter(t => t.trim().length > 0);
  });
  console.log("foreignObjects:", info.slice(0, 3));

  await browser.close();
})();
