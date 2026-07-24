import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const routes = [
  ['home', '/'], ['consultation', '/consultation/'], ['consultation-confirmation', '/consultation/confirmation/'],
  ['booking-confirmation', '/consultation/booking-confirmation/'], ['client-support', '/client-support/'],
  ['support-confirmation', '/client-support/confirmation/'], ['careers', '/careers/'],
  ['career-opportunities', '/careers/opportunities/'], ['recruitment-process', '/careers/process/'],
  ['recruitment-application', '/careers/apply/'], ['recruitment-confirmation', '/careers/confirmation/'],
  ['general-inquiry', '/contact/'], ['contact-confirmation', '/contact/confirmation/'],
  ['privacy', '/privacy/'], ['terms', '/terms/'], ['disclaimer', '/disclaimer/'], ['cookies', '/cookies/'],
  ['system-error', '/system-error.html'], ['not-found', '/definitely-not-a-real-page-m6']
];
const viewports = [
  ['1440', 1440, 1000], ['1280', 1280, 900], ['768', 768, 1024], ['390', 390, 844], ['320', 320, 740]
];

async function writeJson(name, value) {
  await fs.mkdir('test-results/evidence', { recursive: true });
  await fs.writeFile(path.join('test-results/evidence', name), JSON.stringify(value, null, 2));
}

for (const [name, route] of routes) {
  test(`${name} renders without serious accessibility violations`, async ({ page }, testInfo) => {
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response, `${route} should respond`).not.toBeNull();
    expect(response.status(), `${route} response`).toBeLessThan(500);
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    const blockers = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    await writeJson(`${testInfo.project.name}-${name}-axe.json`, results);
    expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([]);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
}

test('legacy routes redirect to clean routes', async ({ page }) => {
  const cases = [['/needs-check.html', '/consultation/'], ['/contact.html', '/contact/'], ['/privacy-policy.html', '/privacy/']];
  for (const [legacy, clean] of cases) {
    await page.goto(legacy, { waitUntil: 'domcontentloaded' });
    expect(new URL(page.url()).pathname).toBe(clean);
  }
});

test('preview remains non-indexable', async ({ request }) => {
  const response = await request.get('/');
  expect((response.headers()['x-robots-tag'] || '').toLowerCase()).toContain('noindex');
});

test('consent blocks analytics before acceptance and after rejection', async ({ page }, testInfo) => {
  const analytics = [];
  page.on('request', request => {
    if (/google-analytics|googletagmanager|facebook\.com\/tr/i.test(request.url())) analytics.push(request.url());
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(analytics).toEqual([]);
  const reject = page.getByRole('button', { name: /reject optional/i });
  if (await reject.count()) await reject.click();
  await page.waitForTimeout(1200);
  expect(analytics).toEqual([]);
  await writeJson(`${testInfo.project.name}-consent-network.json`, { analyticsRequests: analytics });
});

test('forms expose separate processing and marketing controls', async ({ page }) => {
  await page.goto('/consultation/', { waitUntil: 'networkidle' });
  const processing = page.locator('[name="processing_consent"]');
  const marketing = page.locator('[name="marketing_consent"]');
  await expect(processing).toHaveCount(1);
  await expect(processing).toHaveAttribute('required', '');
  await expect(marketing).toHaveCount(1);
  await expect(marketing).not.toBeChecked();
  await expect(page.locator('[name="consent"]')).toHaveCount(1);
});

test('keyboard navigation exposes skip link and no immediate trap', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('aria-label') || '');
  expect(focused.toLowerCase()).toContain('skip');
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBeFalsy();
});

for (const [label, width, height] of viewports) {
  test(`screenshot matrix ${label}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await fs.mkdir(`test-results/screenshots/${testInfo.project.name}/${label}`, { recursive: true });
    for (const [name, route] of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, `${name} has horizontal overflow at ${width}`).toBeFalsy();
      await page.screenshot({ path: `test-results/screenshots/${testInfo.project.name}/${label}/${name}.png`, fullPage: true });
    }
  });
}
