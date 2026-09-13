const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
     // I notice that in `enhance()`, we do:
     // code.innerHTML = ... hljs ...
     // Wait!
     // In enhance:
     /*
        box.dataset.src = code.textContent;
        code.parentElement.replaceWith(box);
     */
     // code.textContent gets the text.

     // What if we try to extract the text content of the node itself to see if the nodes have text?
     const fo = document.querySelector('.mermaid-box foreignObject');
     return fo ? fo.innerHTML : "none";
  });
  console.log("foreignObject real HTML:", result);

  await browser.close();
})();
