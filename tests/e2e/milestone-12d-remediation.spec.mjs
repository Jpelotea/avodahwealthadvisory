import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const phase = fs.readFileSync('.github/milestone-12d-phase', 'utf8').trim().toUpperCase();
const resultsDir = path.join('test-results', 'milestone-12d');
fs.mkdirSync(resultsDir, { recursive: true });

const routes = [
  ['homepage', '/'],
  ['consultation', '/consultation/'],
  ['client-needs-check', '/consultation/'],
  ['services', '/services/'],
  ['general-inquiry', '/contact/'],
  ['recruitment-application', '/careers/apply/'],
  ['consultation-confirmation', '/consultation/confirmation/'],
  ['support-confirmation', '/client-support/confirmation/'],
  ['recruitment-confirmation', '/careers/confirmation/'],
  ['contact-confirmation', '/contact/confirmation/'],
  ['shared-header-about', '/about/'],
  ['shared-footer-privacy', '/privacy/'],
];

const zooms = [1, 2, 4];

const luminance = (rgb) => {
  const values = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [0, 0, 0];
  const linear = values.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrast = (fg, bg) => {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

test.describe.configure({ mode: 'serial' });

for (const [name, route] of routes) {
  test(`${phase.toLowerCase()} ${name} accessibility and overflow evidence`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: 'networkidle' });
    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((item) => ['critical', 'serious'].includes(item.impact));
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

    const evidence = { phase, browserName, name, route, zoom: {} };
    for (const zoom of zooms) {
      await page.evaluate((value) => { document.documentElement.style.zoom = String(value); }, zoom);
      await page.waitForTimeout(100);
      const metrics = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 2,
        footerEmail: document.querySelector('.avodah-footer a[href^="mailto:"]')?.getBoundingClientRect().toJSON() || null,
        serviceCards: [...document.querySelectorAll('.service-category-card')].map((card) => ({
          id: card.id,
          rect: card.getBoundingClientRect().toJSON(),
          clipped: card.scrollHeight > card.clientHeight + 2 || card.scrollWidth > card.clientWidth + 2,
          buttonCount: card.querySelectorAll('a,button').length,
        })),
      }));
      evidence.zoom[String(zoom)] = metrics;
      await page.screenshot({ path: path.join(resultsDir, `${phase.toLowerCase()}-${browserName}-${name}-${zoom}x.png`), fullPage: true });
      if (phase === 'POST') {
        expect(metrics.horizontalOverflow, `${name} at ${zoom * 100}%`).toBe(false);
        expect(metrics.serviceCards.some((card) => card.clipped), `${name} service clipping at ${zoom * 100}%`).toBe(false);
      }
    }
    fs.writeFileSync(path.join(resultsDir, `${phase.toLowerCase()}-${browserName}-${name}.json`), JSON.stringify(evidence, null, 2));
  });
}

test(`${phase.toLowerCase()} header CTA computed contrast`, async ({ page, browserName }) => {
  await page.goto('/about/', { waitUntil: 'networkidle' });
  const cta = page.locator('.site-header .nav .button-primary').first();
  await expect(cta).toBeVisible();
  const states = {};
  for (const state of ['default', 'hover', 'focus']) {
    if (state === 'hover') await cta.hover();
    if (state === 'focus') await cta.focus();
    states[state] = await cta.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, backgroundColor: style.backgroundColor, outline: style.outline };
    });
    states[state].contrastRatio = contrast(states[state].color, states[state].backgroundColor);
  }
  fs.writeFileSync(path.join(resultsDir, `${phase.toLowerCase()}-${browserName}-header-contrast.json`), JSON.stringify(states, null, 2));
  if (phase === 'POST') {
    expect(states.default.contrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(states.hover.contrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(states.focus.contrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(states.focus.outline).not.toBe('none');
  }
});

test(`${phase.toLowerCase()} form and confirmation DOM contract`, async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const message = page.locator('form[name="consultation"] [name="message"]');
  if (phase === 'POST') await expect(message).not.toHaveAttribute('required', '');

  await page.goto('/careers/apply/', { waitUntil: 'networkidle' });
  if (phase === 'POST') {
    await expect(page.locator('select[name="employment_status"]')).toBeVisible();
    await expect(page.locator('select[name="educational_background"]')).toBeVisible();
    await expect(page.locator('[name="interview_availability"]')).not.toHaveAttribute('required', '');
    await expect(page.locator('[name="relevant_experience"]')).not.toHaveAttribute('required', '');
    await expect(page.locator('[name="reason_for_applying"]')).not.toHaveAttribute('required', '');
    await expect(page.getByText('Résumé upload is not required at this stage.')).toBeVisible();
  }

  await page.goto('/contact/confirmation/', { waitUntil: 'networkidle' });
  if (phase === 'POST') {
    await expect(page.getByRole('link', { name: 'Contact Options' })).toHaveCount(0);
    await expect(page.getByText('Please save your reference number.')).toBeVisible();
  }
});
