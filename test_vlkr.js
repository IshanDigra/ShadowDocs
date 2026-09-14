const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to Vlkr note
  await page.goto('http://localhost:8000/#Vlkr');

  // Wait for mermaid to render - let's check for any mermaid container, it might just be .mermaid
  await page.waitForSelector('.mermaid');

  // Give it a little more time to ensure fonts/styles are applied
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'verification2.png', fullPage: true });

  await browser.close();
})();
