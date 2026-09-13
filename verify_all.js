const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Test 1: Sticky dock positioning
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  // We expand all to make content huge
  await page.click('button[data-act="fold"]');
  await page.waitForTimeout(1000);

  // Scroll down
  await page.evaluate(() => document.querySelector('#doc').scrollTo({ top: 10000 }));
  await page.waitForTimeout(500);

  const dockBox = await page.$eval('#dock', el => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
  });
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  // Dock bottom might be slightly less than viewportHeight if there's safe area inset bottom. It's fine as long as it's not pushing off screen.
  console.log('Dock bottom near viewport?', dockBox.bottom <= viewportHeight, 'viewport:', viewportHeight, 'dock bottom:', dockBox.bottom);

  // Test 2: Search Input Focus and font-size
  await page.click('button[data-act="search"]');
  await page.waitForTimeout(500);

  const searchInputActive = await page.evaluate(() => document.activeElement.classList.contains('sr-input'));
  const searchFontSize = await page.$eval('.sr-input', el => window.getComputedStyle(el).fontSize);
  console.log('Search input focused synchronously?', searchInputActive);
  console.log('Search input font size (expect 16px):', searchFontSize);

  // Close sheet by clicking scrim
  await page.evaluate(() => document.getElementById('scrim').click());
  await page.waitForTimeout(500);

  // Test 3: FAB Switcher functionality
  await page.click('#fab-switch');
  await page.waitForTimeout(500);
  const sheetTitle = await page.evaluate(() => {
     const titleEl = document.querySelector('.sh-title');
     return titleEl ? titleEl.textContent : 'none';
  });
  console.log('FAB clicked, sheet title is:', sheetTitle);

  // Test 4: Mermaid diagram texts
  const mermaidTexts = await page.evaluate(() => {
     return Array.from(document.querySelectorAll('.mermaid-box foreignObject')).map(fo => fo.textContent.trim()).filter(t => t.length > 0);
  });
  console.log('Mermaid texts exist?', mermaidTexts.length > 0, 'First text:', mermaidTexts[0]);

  await browser.close();
})();
