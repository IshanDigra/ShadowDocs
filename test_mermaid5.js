const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // screenshot to view it ourselves
  await page.screenshot({ path: 'mermaid_html_labels.png' });

  await browser.close();
})();
