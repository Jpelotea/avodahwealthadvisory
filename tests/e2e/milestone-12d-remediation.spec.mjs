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

const zoomConditions = [
  { factor: 1, percent: 100, viewportWidth: 1440 },
  { factor: 2, percent: 200, viewportWidth: 720 },
  { factor: 4, percent: 400, viewportWidth: 360 },
];

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

async function captureComponent(page, selector, fileName) {
  const component = page.locator(selector).first();
  if (await component.count() && await component.isVisible().catch(() => false)) {
    await component.screenshot({ path: path.join(resultsDir, fileName), animations: 'disabled' });
    return true;
  }
  return false;
}

for (const [name, route] of routes) {
  test(`${phase.toLowerCase()} ${name} accessibility and overflow evidence`, async ({ page, browserName }) => {
    const evidence = { phase, browserName, name, route, zoomMethod: 'responsive CSS viewport equivalent', zoom: {} };
    for (const condition of zoomConditions) {
      await page.setViewportSize({ width: condition.viewportWidth, height: 1000 });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);

      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter((item) => ['critical', 'serious'].includes(item.impact));
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

      const metrics = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 2,
        footerEmail: document.querySelector('.avodah-footer a[href^="mailto:"]')?.getBoundingClientRect().toJSON() || null,
        serviceCards: [...document.querySelectorAll('.service-category-card')].map((card, order) => ({
          order,
          id: card.id,
          heading: card.querySelector('h2,h3')?.textContent?.trim() || '',
          rect: card.getBoundingClientRect().toJSON(),
          clipped: card.scrollHeight > card.clientHeight + 2 || card.scrollWidth > card.clientWidth + 2,
          buttonCount: card.querySelectorAll('a,button').length,
        })),
      }));

      const prefix = `${phase.toLowerCase()}-${browserName}-${name}-${condition.percent}`;
      await page.screenshot({ path: path.join(resultsDir, `${prefix}-viewport.png`), fullPage: false, animations: 'disabled' });
      const captured = {
        viewport: true,
        footer: await captureComponent(page, '.avodah-footer', `${prefix}-footer.png`),
        services: await captureComponent(page, '.service-category-grid', `${prefix}-services.png`),
        cookieBanner: await captureComponent(page, '.cookie-banner', `${prefix}-cookie-banner.png`),
        primaryCta: await captureComponent(page, '.hero-actions .button-primary', `${prefix}-primary-cta.png`),
      };

      evidence.zoom[String(condition.percent)] = {
        factor: condition.factor,
        viewportWidth: condition.viewportWidth,
        metrics,
        screenshots: captured,
      };
      if (phase === 'POST') {
        expect(metrics.horizontalOverflow, `${name} at ${condition.percent}% equivalent`).toBe(false);
        expect(metrics.serviceCards.some((card) => card.clipped), `${name} service clipping at ${condition.percent}% equivalent`).toBe(false);
      }
    }
    fs.writeFileSync(path.join(resultsDir, `${phase.toLowerCase()}-${browserName}-${name}.json`), JSON.stringify(evidence, null, 2));
  });
}

test(`${phase.toLowerCase()} header CTA computed contrast`, async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  const cta = page.locator('.site-header .nav .button-primary').first();
  await expect(cta).toBeVisible();
  const readState = async () => cta.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, backgroundColor: style.backgroundColor, outline: style.outline };
  });
  const states = {};
  states.default = await readState();
  await cta.hover();
  states.hover = await readState();
  await page.mouse.move(0, 0);
  await cta.focus();
  states.focus = await readState();
  await cta.hover();
  await page.mouse.down();
  states.active = await readState();
  await page.mouse.up();

  for (const state of Object.values(states)) {
    state.contrastRatio = contrast(state.color, state.backgroundColor);
    state.requiredThreshold = 4.5;
  }
  fs.writeFileSync(path.join(resultsDir, `${phase.toLowerCase()}-${browserName}-header-contrast.json`), JSON.stringify(states, null, 2));
  if (phase === 'POST') {
    for (const stateName of ['default', 'hover', 'focus', 'active']) {
      expect(states[stateName].contrastRatio, stateName).toBeGreaterThanOrEqual(4.5);
    }
    expect(states.focus.outline).not.toBe('none');
  }
});

test(`${phase.toLowerCase()} form and confirmation DOM contract`, async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const message = page.locator('form[name="consultation"] [name="message"]');
  if (phase === 'POST') await expect(message).not.toHaveAttribute('required', '');

  await page.goto('/careers/apply/', { waitUntil: 'domcontentloaded' });
  if (phase === 'POST') {
    await expect(page.locator('select[name="employment_status"]')).toBeVisible();
    await expect(page.locator('select[name="educational_background"]')).toBeVisible();
    await expect(page.locator('[name="interview_availability"]')).not.toHaveAttribute('required', '');
    await expect(page.locator('[name="relevant_experience"]')).not.toHaveAttribute('required', '');
    await expect(page.locator('[name="reason_for_applying"]')).not.toHaveAttribute('required', '');
    await expect(page.getByText('Résumé upload is not required at this stage.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Application Process' })).toBeVisible();
  }

  await page.goto('/contact/confirmation/', { waitUntil: 'domcontentloaded' });
  if (phase === 'POST') {
    await expect(page.getByRole('link', { name: 'Contact Options' })).toHaveCount(0);
    await expect(page.getByText('Please save your reference number.')).toBeVisible();
  }
});
