const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // I notice that in `drawMermaid`, it sets `box.innerHTML = svg;`
     // Where is DOMPurify used? In mdToHtml
     const html = window.DOMPurify.sanitize('<svg><foreignObject><div>test</div></foreignObject></svg>');
     return html;
  });
  console.log("DOMPurify sanitize output:", result);

  await browser.close();
})();
