const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // I notice that in app.js `mermaidInit` we have:
     // securityLevel: 'strict'
     const mermaid = await window.__loadMermaid();
     mermaid.initialize({ securityLevel: 'loose' }); // default htmlLabels is false actually, but flowchart htmlLabels true
     const res = await mermaid.render('test-4', `graph TD;\n A-->B;`);
     return res.svg.includes("foreignObject");
  });
  console.log("Includes foreignObject:", result);

  await browser.close();
})();
