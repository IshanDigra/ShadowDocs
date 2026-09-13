const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // Find foreignObject bodies
  const info = await page.evaluate(() => {
     const boxes = Array.from(document.querySelectorAll('.mermaid-box foreignObject'));
     return boxes.map(b => b.innerHTML).filter(t => t.trim().length > 0);
  });
  console.log("foreignObject contents:", info.slice(0, 3));

  await browser.close();
})();
