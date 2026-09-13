const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // I notice that in app.js `mermaidInit` we have:
     // securityLevel: 'strict', suppressErrorRendering: true
     const mermaid = await window.__loadMermaid();
     mermaid.initialize({ securityLevel: 'strict', flowchart: { htmlLabels: false } });
     const res = await mermaid.render('test-3', `graph TD;\n A-->B;`);
     const parser = new DOMParser();
     const doc = parser.parseFromString(res.svg, 'image/svg+xml');
     const texts = Array.from(doc.querySelectorAll('text'));
     return texts.map(t => t.outerHTML).join(', ');
  });
  console.log("Texts with strict and htmlLabels false:", result);

  await browser.close();
})();
