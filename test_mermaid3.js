const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // check texts inside mermaid box - maybe htmlLabels is true and texts are in divs
  const texts = await page.evaluate(() => {
     const box = document.querySelector('.mermaid-box');
     if (box) return box.innerText;
     return "no box";
  });
  console.log("InnerText:", texts);

  await browser.close();
})();
