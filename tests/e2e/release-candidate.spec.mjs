import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const CONSENT_STORAGE_KEY = 'avodah_cookie_preferences';
const routes = [
  ['home', '/'], ['consultation', '/consultation/'], ['consultation-confirmation', '/consultation/confirmation/'],
  ['booking-confirmation', '/consultation/booking-confirmation/'], ['client-support', '/client-support/'],
  ['support-confirmation', '/client-support/confirmation/'], ['careers', '/careers/'],
  ['career-opportunities', '/careers/opportunities/'], ['recruitment-process', '/careers/process/'],
  ['recruitment-application', '/careers/apply/'], ['recruitment-confirmation', '/careers/confirmation/'],
  ['general-inquiry', '/contact/'], ['contact-confirmation', '/contact/confirmation/'],
  ['privacy', '/privacy/'], ['terms', '/terms/'], ['disclaimer', '/disclaimer/'], ['cookies', '/cookies/'],
  ['system-error', '/system-error.html'], ['not-found', '/definitely-not-a-real-page-m7']
];

const viewports = [
  ['1440', 1440, 1000], ['1280', 1280, 900], ['768', 768, 1024], ['390', 390, 844], ['320', 320, 740]
];

const analyticsPattern = /google-analytics|googletagmanager|facebook\.com\/tr/i;
const collectionPattern = /google-analytics\.com|analytics\.google\.com|googletagmanager\.com\/g\/collect/i;
const forbiddenAnalyticsValues = [
  'TEST M7 — Not a Real Client', 'test-m7@example.invalid', '09170000000',
  'Synthetic Milestone 7 form verification only', 'booking-management-token-test'
];

async function writeJson(name, value) {
  await fs.mkdir('test-results/evidence', { recursive: true });
  await fs.writeFile(path.join('test-results/evidence', name), JSON.stringify(value, null, 2));
}

async function gotoReady(page, route) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(350);
  return response;
}

async function activate(locator) {
  await locator.focus();
  await locator.dispatchEvent('click');
}

function isPreviewPlatformNoise(text) {
  return /app\.netlify\.com/i.test(text) ||
    (/Applying inline style violates/i.test(text) && /sha256-/i.test(text));
}

async function captureAnalytics(page) {
  const requests = [];
  page.on('request', request => {
    if (analyticsPattern.test(request.url())) {
      requests.push({ url: request.url(), method: request.method(), postData: request.postData() || '' });
    }
  });
  await page.route(collectionPattern, async route => {
    const request = route.request();
    requests.push({ url: request.url(), method: request.method(), postData: request.postData() || '', intercepted: true });
    await route.abort('blockedbyclient');
  });
  return requests;
}

for (const [name, route] of routes) {
  test(`${name} renders without serious accessibility violations`, async ({ page }, testInfo) => {
    const consoleErrors = [];
    const previewNoise = [];
    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      const expectedNotFoundNoise = name === 'not-found' && /status of 404/i.test(text);
      if (expectedNotFoundNoise || isPreviewPlatformNoise(text)) previewNoise.push(text);
      else consoleErrors.push(text);
    });

    const response = await gotoReady(page, route);
    expect(response, `${route} should respond`).not.toBeNull();
    expect(response.status(), `${route} response`).toBeLessThan(500);
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
    await expect(page.locator('h1')).toHaveCount(1);

    const results = await new AxeBuilder({ page }).analyze();
    const blockers = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    await writeJson(`${testInfo.project.name}-${name}-axe.json`, results);
    await writeJson(`${testInfo.project.name}-${name}-console.json`, { consoleErrors, previewPlatformNoise: previewNoise });
    expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([]);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
}

test('legacy routes redirect to clean routes', async ({ page }) => {
  const cases = [
    ['/needs-check.html', '/consultation/'],
    ['/contact.html', '/contact/'],
    ['/privacy-policy.html', '/privacy/']
  ];
  for (const [legacy, clean] of cases) {
    await gotoReady(page, legacy);
    expect(new URL(page.url()).pathname).toBe(clean);
  }
});

test('preview remains non-indexable', async ({ request }) => {
  const response = await request.get('/');
  expect((response.headers()['x-robots-tag'] || '').toLowerCase()).toContain('noindex');
});

test('consent blocks analytics before acceptance and after rejection', async ({ page }, testInfo) => {
  const analytics = await captureAnalytics(page);
  await gotoReady(page, '/');
  expect(analytics).toEqual([]);
  await activate(page.getByRole('button', { name: /reject optional/i }));
  await page.waitForTimeout(1200);
  expect(analytics).toEqual([]);
  await writeJson(`${testInfo.project.name}-consent-before-and-rejected.json`, { analyticsRequests: analytics });
});

test('analytics acceptance sends only consented allowlisted data', async ({ page }, testInfo) => {
  const analytics = await captureAnalytics(page);
  await gotoReady(page, '/');
  await activate(page.getByRole('button', { name: /accept analytics/i }));
  await expect.poll(() => analytics.some(item => /googletagmanager\.com\/gtag\/js/i.test(item.url)), { timeout: 15_000 }).toBe(true);

  await page.evaluate(() => {
    window.AvodahAnalytics?.track('general_inquiry_submitted', {
      workflow: 'general_inquiry', status: 'submitted', inquiry_category: 'general',
      full_name: 'TEST M7 — Not a Real Client', email: 'test-m7@example.invalid',
      mobile_number: '09170000000', message: 'Synthetic Milestone 7 form verification only',
      booking_management_token: 'booking-management-token-test'
    });
  });
  await page.waitForTimeout(1800);

  const serialized = JSON.stringify(analytics);
  for (const prohibited of forbiddenAnalyticsValues) expect(serialized).not.toContain(prohibited);
  expect(await page.evaluate(() => window.AvodahCookiePreferences?.get?.().analytics)).toBe(true);
  await writeJson(`${testInfo.project.name}-consent-accepted-network.json`, { requests: analytics });
});

test('revoking analytics stops future events and removes first-party GA cookies', async ({ page }, testInfo) => {
  const analytics = await captureAnalytics(page);
  await gotoReady(page, '/');
  await activate(page.getByRole('button', { name: /accept analytics/i }));
  await expect.poll(() => analytics.some(item => /googletagmanager\.com\/gtag\/js/i.test(item.url)), { timeout: 15_000 }).toBe(true);

  await activate(page.locator('[data-cookie-reopen]').first());
  const analyticsToggle = page.locator('[data-cookie-analytics]');
  await analyticsToggle.uncheck();
  await activate(page.getByRole('button', { name: /accept selected/i }));
  const before = analytics.length;
  await page.evaluate(() => window.AvodahAnalytics?.track('general_inquiry_submitted', { workflow: 'general_inquiry', status: 'submitted' }));
  await page.waitForTimeout(1500);
  expect(analytics.length).toBe(before);
  const gaCookies = (await page.context().cookies()).filter(cookie => /^_ga|^_gid$|^_gat/.test(cookie.name));
  expect(gaCookies).toEqual([]);
  await writeJson(`${testInfo.project.name}-consent-revoked-network.json`, { requestCountBeforeRevokedEvent: before, requestCountAfter: analytics.length, gaCookies });
});

test('returning current-version analytics preference is applied before optional scripts', async ({ page }, testInfo) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      essential: true, analytics: true, marketing: false,
      version: 'cookie-consent-v2-2026-07-24', saved_at: new Date().toISOString()
    }));
  }, { key: CONSENT_STORAGE_KEY });
  const analytics = await captureAnalytics(page);
  await gotoReady(page, '/');
  await expect.poll(() => analytics.some(item => /googletagmanager\.com\/gtag\/js/i.test(item.url)), { timeout: 15_000 }).toBe(true);
  await writeJson(`${testInfo.project.name}-consent-returning-visitor.json`, { requests: analytics });
});

test('outdated consent version returns to denied default', async ({ page }, testInfo) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      essential: true, analytics: true, marketing: true,
      version: 'outdated-consent-version', saved_at: new Date().toISOString()
    }));
  }, { key: CONSENT_STORAGE_KEY });
  const analytics = await captureAnalytics(page);
  await gotoReady(page, '/');
  await page.waitForTimeout(1200);
  expect(analytics).toEqual([]);
  await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  await writeJson(`${testInfo.project.name}-consent-outdated-version.json`, { analyticsRequests: analytics, bannerVisible: true });
});

test('forms expose separate processing and marketing controls', async ({ page }) => {
  await gotoReady(page, '/consultation/');
  const processing = page.locator('[name="processing_consent"]');
  const marketingControl = page.locator('[data-marketing-consent-control]');
  const marketingChoice = page.locator('input[type="hidden"][name="marketing_consent"]');
  const compatibility = page.locator('input[type="hidden"][name="consent"]');
  await expect(processing).toHaveCount(1, { timeout: 30_000 });
  await expect(marketingControl).toHaveCount(1, { timeout: 30_000 });
  await expect(marketingControl).not.toBeChecked();
  await expect(marketingChoice).toHaveValue('No');
  await expect(compatibility).toHaveCount(1);

  await page.evaluate(() => document.querySelector('input[name="book_consultation"][value="Yes"]')?.click());
  await expect.poll(() => page.evaluate(() => document.querySelector('[name="processing_consent"]')?.required)).toBe(true);
  await page.evaluate(() => {
    const form = document.querySelector('#needs-form');
    const processingInput = form.querySelector('[name="processing_consent"]');
    const marketingInput = form.querySelector('[data-marketing-consent-control]');
    processingInput.checked = true;
    marketingInput.checked = false;
    form.addEventListener('submit', event => event.preventDefault(), { once: true });
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(compatibility).toHaveValue('Yes');
  await expect(marketingChoice).toHaveValue('No');

  await marketingControl.check({ force: true });
  await page.evaluate(() => {
    const form = document.querySelector('#needs-form');
    form.addEventListener('submit', event => event.preventDefault(), { once: true });
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(compatibility).toHaveValue('Yes');
  await expect(marketingChoice).toHaveValue('Yes');
});

test('keyboard navigation exposes skip link and no immediate trap', async ({ page }) => {
  await gotoReady(page, '/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('aria-label') || '');
  expect(focused.toLowerCase()).toContain('skip');
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBeFalsy();
});

test('cookie dialog traps focus, closes with Escape, and restores focus', async ({ page }) => {
  await gotoReady(page, '/');
  const settings = page.getByRole('button', { name: /choose preferences/i });
  await settings.focus();
  await settings.dispatchEvent('click');
  const dialog = page.getByRole('dialog', { name: /cookie preferences/i });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(settings).toBeFocused();
});

for (const [label, width, height] of viewports) {
  test(`screenshot matrix ${label}`, async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height });
    const directory = `test-results/screenshots/${testInfo.project.name}/${label}`;
    await fs.mkdir(directory, { recursive: true });
    const index = [];

    for (const [name, route] of routes) {
      let status = 0;
      let error = '';
      try {
        const response = await gotoReady(page, route);
        status = response?.status() || 0;
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        expect.soft(overflow, `${name} has horizontal overflow at ${width}`).toBeFalsy();
      } catch (caught) {
        error = String(caught?.message || caught);
        expect.soft(error, `${name} should render at ${width}`).toBe('');
      }
      const filename = `${name}.png`;
      await page.screenshot({ path: `${directory}/${filename}`, fullPage: true });
      index.push({ page: name, route, browser: testInfo.project.name, viewport: label, filename: `${testInfo.project.name}/${label}/${filename}`, httpStatus: status, error });
    }

    await writeJson(`screenshot-index-${testInfo.project.name}-${label}.json`, index);
  });
}
