import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const expectedCommit = process.env.EXPECTED_COMMIT || '';
const expectedMarker = process.env.EXPECTED_RC_REVISION || 'm9-definitive-evidence-v1';
const priorityRoutes = ['/', '/consultation/', '/client-support/', '/careers/apply/', '/system-error.html'];
const previewHostname = new URL(process.env.PLAYWRIGHT_BASE_URL || 'https://invalid.example').hostname;
const netlifyToolbarStyleHash = 'sha256-dH+oOZOdDv+MWU0F8bCZOoFHX0jFM4+bwNqOKujbv90=';

async function writeEvidence(name, data) {
  await fs.mkdir('test-results/evidence', { recursive: true });
  await fs.writeFile(`test-results/evidence/${name}`, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function isExactPreviewToolbarNoise(text) {
  const toolbarStyleViolation = previewHostname.startsWith('deploy-preview-8--') &&
    /Applying inline style violates/i.test(text) && text.includes(netlifyToolbarStyleHash);
  return /app\.netlify\.com|deployID=|Source: position:fixed/i.test(text) || toolbarStyleViolation;
}

test('release endpoint, Edge health, and preview headers identify the exact revision', async ({ request }, testInfo) => {
  const root = await request.get('/');
  const release = await request.get('/rc-revision.json', { headers: { 'cache-control': 'no-cache' } });
  const edge = await request.get('/edge-health.json', { headers: { 'cache-control': 'no-cache' } });

  const releaseBody = await release.json();
  const edgeBody = await edge.json();
  const evidence = {
    browser: testInfo.project.name,
    rootStatus: root.status(),
    rootHeaders: root.headers(),
    releaseStatus: release.status(),
    release: releaseBody,
    edgeStatus: edge.status(),
    edge: edgeBody,
  };
  await writeEvidence(`${testInfo.project.name}-release-evidence.json`, evidence);

  expect(root.status()).toBe(200);
  expect((root.headers()['x-robots-tag'] || '').toLowerCase()).toContain('noindex');
  expect(root.headers()['x-avodah-rc-revision']).toBe(expectedMarker);
  expect(root.headers()['x-avodah-deploy-context']).toBe('deploy-preview');
  expect(releaseBody.releaseMarker).toBe(expectedMarker);
  if (expectedCommit) expect(releaseBody.revision).toBe(expectedCommit);
  expect(releaseBody.deployContext).toBe('deploy-preview');
  expect(edgeBody).toMatchObject({
    status: 'ok',
    releaseMarker: expectedMarker,
    deployContext: 'deploy-preview',
  });
  expect(edgeBody.deployId).toBe(releaseBody.deployId);
});

for (const route of priorityRoutes) {
  test(`${route} operates under the strict application CSP`, async ({ page }, testInfo) => {
    const cspErrors = [];
    const previewToolbarNoise = [];
    page.on('console', message => {
      if (message.type() !== 'error' || !/content-security-policy|refused to execute|refused to load/i.test(message.text())) return;
      const text = message.text();
      if (isExactPreviewToolbarNoise(text)) previewToolbarNoise.push(text);
      else cspErrors.push(text);
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    expect(response).not.toBeNull();
    const csp = response.headers()['content-security-policy'] || '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");

    const applicationInlineHandlers = await page.locator('[onclick],[onchange],[onsubmit],[onload],[onerror],[oninput],[onfocus],[onblur]').count();
    expect(applicationInlineHandlers).toBe(0);

    const staticAnalyticsLoaders = await page.locator('script[src*="googletagmanager.com/gtag/js"],script[src*="google-analytics.com"]').count();
    expect(staticAnalyticsLoaders).toBe(0);

    if (route === '/system-error.html') {
      await expect(page.locator('script[src^="/system-error.js"]')).toHaveCount(1);
    }

    await page.waitForTimeout(750);
    await writeEvidence(`${testInfo.project.name}-${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-csp.json`, {
      route,
      csp,
      applicationInlineHandlers,
      staticAnalyticsLoaders,
      cspErrors,
      previewToolbarNoise,
    });
    expect(cspErrors).toEqual([]);
  });
}
