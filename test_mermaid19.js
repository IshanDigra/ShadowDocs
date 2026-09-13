const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // Does Mermaid generate HTML correctly outside DOMPurify?
     const mermaid = await window.__loadMermaid();
     const res = await mermaid.render('test-1', `graph TD;\n A-->B;`);
     return res.svg.substring(0, 800);
  });
  console.log("SVG output:", result);

  await browser.close();
})();
