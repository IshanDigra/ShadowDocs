const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // I notice that in `drawMermaid`, `mermaid.render` uses `suppressErrorRendering: true` in initialize.
     // Also `securityLevel: 'strict'` is used. Strict strips out all tags from labels if htmlLabels is true!
     // AHA! strict mode strips tags. That's why the text is empty!
     // Wait, if it strips tags, what about the text itself?
     // Let's check securityLevel: 'loose' or securityLevel: 'antiscript'
     const mermaid = await window.__loadMermaid();
     mermaid.initialize({ securityLevel: 'loose', flowchart: { htmlLabels: true } });
     const res = await mermaid.render('test-2', `graph TD;\n A-->B;`);
     const parser = new DOMParser();
     const doc = parser.parseFromString(res.svg, 'image/svg+xml');
     const fo = doc.querySelector('foreignObject');
     return fo ? fo.outerHTML : "none";
  });
  console.log("foreignObject with securityLevel loose:", result);

  await browser.close();
})();
