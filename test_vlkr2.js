const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000/#Vlkr');

  await page.waitForTimeout(5000);

  // Dump console logs for debugging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.screenshot({ path: 'verification2.png', fullPage: true });

  await browser.close();
})();
