const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  await page.click('#fab-switch');
  await page.waitForTimeout(1500);

  // The sheet title is empty because sheetSwitcher opens 'Tickets' in '.sh-title'
  const title = await page.evaluate(() => {
    return document.body.innerHTML.includes('Tickets');
  });
  console.log('FAB sheet opened and has "Tickets"?', title);

  await page.screenshot({ path: 'fab_test2.png' });

  await browser.close();
})();
