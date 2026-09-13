const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // See if DOMPurify removed the children of foreignObject
  const info = await page.evaluate(() => {
     // DOMPurify might not be the culprit since mermaid processes diagram text and sets innerHTML of the box directly!
     // Wait, drawMermaid uses box.innerHTML = svg;
     // Let's check window.DOMPurify config just in case.
     return true;
  });

  await browser.close();
})();
