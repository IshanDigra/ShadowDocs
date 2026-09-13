const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     const mermaid = await window.__loadMermaid();
     // turn off htmlLabels
     mermaid.initialize({ flowchart: { htmlLabels: false } });
     const res = await mermaid.render('test-1', `graph TD;\n A-->B;`);
     // check if there is any text element inside res.svg
     const parser = new DOMParser();
     const doc = parser.parseFromString(res.svg, 'image/svg+xml');
     const texts = Array.from(doc.querySelectorAll('text'));
     return texts.map(t => t.outerHTML).join(', ');
  });
  console.log("Texts from manual render with htmlLabels=false:", result);

  await browser.close();
})();
