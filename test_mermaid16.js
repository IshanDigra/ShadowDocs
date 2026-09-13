const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // Render mermaid manually and see what DOMPurify does if it intercepts it (it shouldn't intercept `box.innerHTML = svg;`)
     const mermaid = await window.__loadMermaid();
     const res = await mermaid.render('test-1', `graph TD;\n A-->B;`);
     return res.svg.substring(0, 500);
  });
  console.log("Raw Mermaid SVG:", result);

  await browser.close();
})();
