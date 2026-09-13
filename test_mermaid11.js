const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // Dump texts of all mermaid boxes in the document
  const info = await page.evaluate(() => {
     const boxes = Array.from(document.querySelectorAll('.mermaid-box'));
     return boxes.map(b => b.innerText).filter(t => t.trim().length > 0);
  });
  console.log("Mermaid boxes texts:", info);

  await browser.close();
})();
