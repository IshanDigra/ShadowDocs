const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  await page.click('#fab-switch');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'fab_screenshot.png' });

  const title = await page.$eval('.sh-title', el => el.textContent);
  console.log('FAB sheet title:', title);

  await browser.close();
})();
