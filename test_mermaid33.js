const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     const mermaid = await window.__loadMermaid();
     mermaid.initialize({ securityLevel: 'antiscript' });
     const res = await mermaid.render('test-4', `graph TD;\n A[First] --> B[Second];`);
     const fo = document.createElement('div');
     fo.innerHTML = res.svg;
     return Array.from(fo.querySelectorAll('foreignObject')).map(f => f.innerHTML);
  });
  console.log("foreignObject innerHTMLs antiscript:", result);

  await browser.close();
})();
