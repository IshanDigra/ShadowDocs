const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  // click 'fold' to open them all
  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // check texts inside mermaid svg
  const texts = await page.evaluate(() => {
     const svgs = document.querySelectorAll('.mermaid-box svg');
     if (svgs.length > 0) {
        const textElements = svgs[0].querySelectorAll('text');
        return Array.from(textElements).map(t => t.textContent).join(', ');
     }
     return "no svg";
  });
  console.log("Texts:", texts);

  await browser.close();
})();
