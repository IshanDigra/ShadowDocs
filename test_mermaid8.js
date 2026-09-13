const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  // click "Architecture Diagram" specifically, assuming it contains mermaid
  const secs = await page.$$('.sec-h');
  for (const s of secs) {
      const text = await s.innerText();
      if (text.includes("Architecture Diagram")) {
          await s.click();
          break;
      }
  }
  await page.waitForTimeout(2000);

  // scroll to the box
  const box = await page.$('.mermaid-box');
  if (box) {
      await box.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(1000);

  // screenshot to view it ourselves
  await page.screenshot({ path: 'mermaid_html_labels4.png' });

  await browser.close();
})();
