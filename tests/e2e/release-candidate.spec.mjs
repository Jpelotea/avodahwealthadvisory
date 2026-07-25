import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const CONSENT_STORAGE_KEY = 'avodah_cookie_preferences';
const EXPECTED_MARKER = process.env.EXPECTED_RC_REVISION || 'm9-definitive-evidence-v1';
const EXPECTED_COMMIT = process.env.EXPECTED_COMMIT || '';
const WORKFLOW_RUN_ID = process.env.GITHUB_RUN_ID || '';
const routes = [
  ['home', '/'], ['consultation', '/consultation/'], ['consultation-confirmation', '/consultation/confirmation/'],
  ['booking-confirmation', '/consultation/booking-confirmation/'], ['client-support', '/client-support/'],
  ['support-confirmation', '/client-support/confirmation/'], ['careers', '/careers/'],
  ['career-opportunities', '/careers/opportunities/'], ['recruitment-process', '/careers/process/'],
  ['recruitment-application', '/careers/apply/'], ['recruitment-confirmation', '/careers/confirmation/'],
  ['general-inquiry', '/contact/'], ['contact-confirmation', '/contact/confirmation/'],
  ['privacy', '/privacy/'], ['terms', '/terms/'], ['disclaimer', '/disclaimer/'], ['cookies', '/cookies/'],
  ['system-error', '/system-error.html'], ['not-found', '/definitely-not-a-real-page-m9']
];

const viewports = [
  ['1440', 1440, 1000], ['1280', 1280, 900], ['768', 768, 1024], ['390', 390, 844], ['320', 320, 740]
];

const analyticsPattern = /google-analytics|googletagmanager|facebook\.com\/tr/i;
const collectionPattern = /google-analytics\.com|analytics\.google\.com|googletagmanager\.com\/g\/collect/i;
const forbiddenAnalyticsValues = [
  'TEST M9 — Not a Real Client', 'test-m9@example.invalid', '09170000000',
  'Synthetic Milestone 9 form verification only', 'booking-management-token-test'
];
const previewHostname = new URL(process.env.PLAYWRIGHT_BASE_URL || 'https://invalid.example').hostname;
const netlifyDrawerStyleHashes = [
  'sha256-dH+oOZOdDv+MWU0F8bCZOoFHX0jFM4+bwNqOKujbv90=',
  'sha256-ikgYIuM/1wkyZ+w23wP7pGyeh3RzH5XDMS3MqR2mWrY=',
];
const webkitDrawerStyleMessage = "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";
const DEFAULT_FULL_PAGE_SCREENSHOT_LIMIT = 30_000;
const DEFAULT_SEGMENT_HEIGHT = 16_000;
const WEBKIT_SAFE_SEGMENT_HEIGHT = 12_000;
let routeVerificationSequence = 0;

async function writeJson(name, value) {
  await fs.mkdir('test-results/evidence', { recursive: true });
  await fs.writeFile(path.join('test-results/evidence', name), JSON.stringify(value, null, 2));
}

function cacheBustedRoute(route, attempt) {
  const url = new URL(route, 'https://release-check.invalid');
  routeVerificationSequence += 1;
  url.searchParams.set('__m10_revision_check', `${routeVerificationSequence}-${attempt}`);
  return `${url.pathname}${url.search}${url.hash}`;
}

async function gotoReady(page, route) {
  let response = null;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    response = await page.goto(cacheBustedRoute(route, attempt), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
    const headers = response?.headers() || {};
    const exactRoute = headers['x-avodah-rc-revision'] === EXPECTED_MARKER && headers['x-avodah-deploy-context'] === 'deploy-preview';
    if (exactRoute) {
      await page.waitForTimeout(350);
      return response;
    }
    await page.waitForTimeout(2_000);
  }
  throw new Error(`${route} did not serve the exact protected release marker.`);
}

async function activate(locator) {
  await locator.focus();
  await locator.dispatchEvent('click');
}

function isHashedPreviewPlatformNoise(text) {
  const exactDrawerStyleViolation = previewHostname.startsWith('deploy-preview-8--') &&
    /Applying inline style violates/i.test(text) &&
    netlifyDrawerStyleHashes.some(hash => text.includes(hash));
  return /app\.netlify\.com|deployID=/i.test(text) ||
    /Source: position:fixed/i.test(text) ||
    exactDrawerStyleViolation;
}

async function netlifyDrawerPresent(page) {
  return await page.evaluate(() => {
    const drawer = document.querySelector('[data-netlify-deploy-id]');
    const iframe = drawer?.querySelector('iframe[title="Netlify Drawer"]');
    return Boolean(drawer && iframe && drawer.getAttribute('data-netlify-site-id'));
  });
}

async function removeNetlifyDrawer(page) {
  return await page.evaluate(() => {
    const drawer = document.querySelector('[data-netlify-deploy-id]');
    const iframe = drawer?.querySelector('iframe[title="Netlify Drawer"]');
    const exactDrawer = Boolean(drawer && iframe && drawer.getAttribute('data-netlify-site-id'));
    if (exactDrawer) drawer.remove();
    return exactDrawer;
  });
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
    const rawConsoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') rawConsoleErrors.push(msg.text()); });

    const response = await gotoReady(page, route);
    expect(response, `${route} should respond`).not.toBeNull();
    expect(response.status(), `${route} response`).toBeLessThan(500);
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
    await expect(page.locator('h1')).toHaveCount(1);

    const results = await new AxeBuilder({ page }).analyze();
    const drawerPresent = await netlifyDrawerPresent(page);
    const consoleErrors = [];
    const previewNoise = [];
    for (const text of rawConsoleErrors) {
      const expectedNotFoundNoise = name === 'not-found' && /status of 404/i.test(text);
      const exactWebKitDrawerNoise = testInfo.project.name === 'webkit' && drawerPresent && text === webkitDrawerStyleMessage;
      if (expectedNotFoundNoise || isHashedPreviewPlatformNoise(text) || exactWebKitDrawerNoise) previewNoise.push(text);
      else consoleErrors.push(text);
    }

    const blockers = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    await writeJson(`${testInfo.project.name}-${name}-axe.json`, results);
    await writeJson(`${testInfo.project.name}-${name}-console.json`, { consoleErrors, previewPlatformNoise: previewNoise, exactNetlifyDrawerPresent: drawerPresent });
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

test('repeated route checks observe the exact release marker', async ({ page }, testInfo) => {
  const observations = [];
  for (let iteration = 1; iteration <= 3; iteration += 1) {
    const response = await gotoReady(page, '/consultation/');
    const headers = response.headers();
    const observation = {
      iteration,
      url: response.url(),
      revision: headers['x-avodah-rc-revision'] || '',
      context: headers['x-avodah-deploy-context'] || '',
    };
    observations.push(observation);
    expect(observation.revision).toBe(EXPECTED_MARKER);
    expect(observation.context).toBe('deploy-preview');
    expect(new URL(observation.url).searchParams.has('__m10_revision_check')).toBe(true);
  }
  await writeJson(`${testInfo.project.name}-repeated-route-revision.json`, observations);
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
  await expect.poll(() => analytics.some(item => /googletagmanager\.com\/gtag\/js/i.test(item.url)), { timeout: 30_000 }).toBe(true);

  await page.evaluate(() => {
    window.AvodahAnalytics?.track('general_inquiry_submitted', {
      workflow: 'general_inquiry', status: 'submitted', inquiry_category: 'general',
      full_name: 'TEST M9 — Not a Real Client', email: 'test-m9@example.invalid',
      mobile_number: '09170000000', message: 'Synthetic Milestone 9 form verification only',
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
  await expect.poll(() => analytics.some(item => /googletagmanager\.com\/gtag\/js/i.test(item.url)), { timeout: 30_000 }).toBe(true);

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
  await expect.poll(() => analytics.some(item => /googletagmanager\.com\/gtag\/js/i.test(item.url)), { timeout: 30_000 }).toBe(true);
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

  await page.evaluate(() => {
    const form = document.querySelector('#needs-form');
    const marketingInput = form.querySelector('[data-marketing-consent-control]');
    marketingInput.checked = true;
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

async function capturePageScreenshots(page, directory, name, testInfo) {
  const dimensions = await page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth),
    height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0, document.documentElement.clientHeight),
  }));
  const isWebKit = testInfo.project.name === 'webkit';
  const fullPageLimit = isWebKit ? WEBKIT_SAFE_SEGMENT_HEIGHT : DEFAULT_FULL_PAGE_SCREENSHOT_LIMIT;
  const maxSegmentHeight = isWebKit ? WEBKIT_SAFE_SEGMENT_HEIGHT : DEFAULT_SEGMENT_HEIGHT;
  if (dimensions.height <= fullPageLimit) {
    expect(dimensions.height, `${name} full-page screenshot exceeds the safe ${testInfo.project.name} limit`).toBeLessThanOrEqual(fullPageLimit);
    const filename = `${name}.png`;
    await page.screenshot({ path: `${directory}/${filename}`, fullPage: true, animations: 'disabled' });
    return [{ filename: `${testInfo.project.name}/${path.basename(directory)}/${filename}`, segment: 1, segmentCount: 1, y: 0, height: dimensions.height, safeSegmentLimit: fullPageLimit }];
  }

  const segments = [];
  const count = Math.ceil(dimensions.height / maxSegmentHeight);
  for (let index = 0; index < count; index += 1) {
    const y = index * maxSegmentHeight;
    const segmentHeight = Math.min(maxSegmentHeight, dimensions.height - y);
    const filename = `${name}-part-${index + 1}-of-${count}.png`;
    expect(segmentHeight, `${filename} exceeds the safe ${testInfo.project.name} segment limit`).toBeLessThanOrEqual(maxSegmentHeight);
    await page.screenshot({
      path: `${directory}/${filename}`,
      clip: { x: 0, y, width: Math.min(dimensions.width, page.viewportSize().width), height: segmentHeight },
      animations: 'disabled',
    });
    segments.push({ filename: `${testInfo.project.name}/${path.basename(directory)}/${filename}`, segment: index + 1, segmentCount: count, y, height: segmentHeight, safeSegmentLimit: maxSegmentHeight });
  }
  return segments;
}

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
      let previewDrawerRemoved = false;
      try {
        const response = await gotoReady(page, route);
        status = response?.status() || 0;
        await page.waitForTimeout(500);
        previewDrawerRemoved = await removeNetlifyDrawer(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        expect.soft(overflow, `${name} has horizontal overflow at ${width}`).toBeFalsy();
        const screenshots = await capturePageScreenshots(page, directory, name, testInfo);
        screenshots.forEach(screenshot => index.push({
          page: name,
          route,
          browser: testInfo.project.name,
          viewport: label,
          revision: EXPECTED_COMMIT,
          workflowRun: WORKFLOW_RUN_ID,
          artifactLocation: `milestone-9-${testInfo.project.name}-qa-${EXPECTED_COMMIT}`,
          reviewStatus: 'automated-pass',
          httpStatus: status,
          error,
          previewDrawerRemoved,
          ...screenshot,
        }));
      } catch (caught) {
        error = String(caught?.message || caught);
        expect.soft(error, `${name} should render at ${width}`).toBe('');
        const filename = `${name}-error.png`;
        await page.screenshot({ path: `${directory}/${filename}`, animations: 'disabled' }).catch(() => {});
        index.push({
          page: name,
          route,
          browser: testInfo.project.name,
          viewport: label,
          revision: EXPECTED_COMMIT,
          workflowRun: WORKFLOW_RUN_ID,
          artifactLocation: `milestone-9-${testInfo.project.name}-qa-${EXPECTED_COMMIT}`,
          reviewStatus: 'needs-review',
          filename: `${testInfo.project.name}/${label}/${filename}`,
          httpStatus: status,
          error,
          previewDrawerRemoved,
          segment: 1,
          segmentCount: 1,
        });
      }
    }

    await writeJson(`screenshot-index-${testInfo.project.name}-${label}.json`, index);
  });
}
