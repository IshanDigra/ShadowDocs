const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // The issue with mermaid might be that `code.textContent` is used?
     // Wait, maybe we should just set `htmlLabels: false` and the text will be rendered in pure SVG `<text>` elements which are safe from stripping or empty rendering?
     // Let's test if `htmlLabels: false` fixes it.

     const mermaid = await window.__loadMermaid();
     mermaid.initialize({ flowchart: { htmlLabels: false } });
     const res = await mermaid.render('test-1', `graph TD;\n A-->B;`);
     return res.svg.substring(0, 500);
  });
  console.log("SVG output with htmlLabels false:", result);

  await browser.close();
})();
