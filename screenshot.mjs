import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

await page.goto('http://localhost:3005/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'screenshot_login.png' });
console.log('Login URL:', page.url());

const inputs = await page.$$('input');
for (const inp of inputs) {
  const type = await inp.getAttribute('type');
  const name = await inp.getAttribute('name');
  const placeholder = await inp.getAttribute('placeholder');
  console.log('input:', { type, name, placeholder });
}

await browser.close();
