const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  // Wait for the notes to load and fold all to trigger mermaid
  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshot1.png' });

  // Check if there is any mermaid diagram
  const mermaidText = await page.evaluate(() => {
     const svgs = document.querySelectorAll('.mermaid-box svg');
     if (svgs.length > 0) return svgs[0].outerHTML.substring(0, 500);
     return "no svg";
  });
  console.log("SVG:", mermaidText);

  await browser.close();
})();
