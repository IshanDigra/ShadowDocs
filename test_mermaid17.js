const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  // get CSS computed styles of text inside mermaid boxes (specifically the empty divs or foreignObjects)
  const info = await page.evaluate(() => {
     const textElements = Array.from(document.querySelectorAll('.mermaid-box .nodeLabel, .mermaid-box .edgeLabel, .mermaid-box span, .mermaid-box p, .mermaid-box text'));
     return textElements.map(el => {
         const style = window.getComputedStyle(el);
         return `${el.tagName}: color=${style.color}, fill=${style.fill}, display=${style.display}, opacity=${style.opacity}, visibility=${style.visibility}, font-size=${style.fontSize}, textContent='${el.textContent.trim()}'`;
     });
  });
  console.log("Styles of mermaid texts:", info.slice(0, 10));

  await browser.close();
})();
