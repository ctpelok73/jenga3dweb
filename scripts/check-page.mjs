import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

page.on('response', (resp) => {
  if (resp.status() >= 400) console.log(`[NET] ${resp.status()} ${resp.url()}`);
});

await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle', timeout: 15000 });

const html = await page.content();
console.log('HTML contains root:', html.includes('id="root"'));
console.log('HTML contains start screen heading:', html.includes('Jenga 3D'));
console.log('Errors:', JSON.stringify(errors, null, 2));

// Check if root is actually populated
const rootContent = await page.evaluate(() => {
  const root = document.getElementById('root');
  return root ? root.innerHTML.substring(0, 500) : 'no root';
});
console.log('Root content:', rootContent);

await browser.close();
