const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // Wait, in drawMermaid:
     // box.innerHTML = svg;
     // The issue might simply be that htmlLabels is true, but mermaid is generating foreignObject without required namespaces, or DOMPurify strips html labels later? But drawMermaid does not use DOMPurify!

     // What if we set htmlLabels to false globally in mermaidInit?
     return true;
  });
  console.log("Did check");

  await browser.close();
})();
