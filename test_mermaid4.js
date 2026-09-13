const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // check DOM structure of SVG foreignObject or divs inside
  const domInfo = await page.evaluate(() => {
     const box = document.querySelector('.mermaid-box');
     if (!box) return "no box";
     const foreignObjects = box.querySelectorAll('foreignObject');
     return {
        foreignObjectCount: foreignObjects.length,
        foreignObjectHtml: foreignObjects.length > 0 ? foreignObjects[0].outerHTML.substring(0, 300) : "none"
     }
  });
  console.log("DOM Info:", domInfo);

  await browser.close();
})();
