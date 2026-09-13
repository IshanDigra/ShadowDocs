const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // I notice that in `drawMermaid`, it sets `box.innerHTML = svg;`
     // Wait, in drawMermaid, does DOMPurify sanitize it?
     // Let's check drawMermaid in app.js
     return window.DOMPurify.sanitize('<svg><foreignObject><div>test</div></foreignObject></svg>', {ADD_TAGS: ['foreignObject']});
  });
  console.log("DOMPurify sanitize output with foreignObject allowed:", result);

  await browser.close();
})();
