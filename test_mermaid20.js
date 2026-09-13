const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     const mermaid = await window.__loadMermaid();
     const res = await mermaid.render('test-1', `graph TD;\n A-->B;`);
     // check if foreignObject inside res.svg is empty
     const parser = new DOMParser();
     const doc = parser.parseFromString(res.svg, 'image/svg+xml');
     const fo = doc.querySelector('foreignObject');
     return fo ? fo.outerHTML : "none";
  });
  console.log("foreignObject from manual render:", result);

  await browser.close();
})();
