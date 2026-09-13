const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
     // Check if there's any text node at all in foreignObject
     const foreignObjects = Array.from(document.querySelectorAll('foreignObject'));
     return foreignObjects.map(fo => {
         return fo.outerHTML;
     });
  });
  console.log("foreignObjects outerHTML:", info.slice(0, 3));

  await browser.close();
})();
