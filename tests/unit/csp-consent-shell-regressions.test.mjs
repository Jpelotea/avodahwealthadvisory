import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('global FAQ and consultation progress scripts do not write inline styles', async () => {
  const [globalScript, needsScript] = await Promise.all([
    readSource('script.js'),
    readSource('needs-check.js'),
  ]);

  assert.doesNotMatch(globalScript, /\.style\s*\./, 'script.js must not create CSP-blocked style attributes');
  assert.doesNotMatch(needsScript, /\.style\s*\./, 'needs-check.js must not create CSP-blocked style attributes');
  assert.match(globalScript, /details\.addEventListener\("toggle",sync\)/);
  assert.match(needsScript, /progressTrack\.dataset\.step=String\(number\)/);
});

test('consultation required-state logic uses processing consent, not legacy compatibility consent', async () => {
  const source = await readSource('needs-check.js');
  assert.match(source, /"preferred_contact_method","processing_consent"/);
  assert.doesNotMatch(source, /"preferred_contact_method","consent"/);
});

test('site shell preserves specialized headers and contains skip links in a navigation landmark', async () => {
  const source = await readSource('site-shell.js');
  assert.match(source, /const specializedHeader = document\.querySelector\("header"\)/);
  assert.match(source, /navigation\.setAttribute\("aria-label", "Skip links"\)/);
  assert.match(source, /links\.forEach\(\(link\) => navigation\?\.append\(link\)\)/);
});

test('Netlify Drawer exclusions remain exact-host, exact-signature, and exact-selector scoped', async () => {
  const [releaseCandidate, security] = await Promise.all([
    readSource('tests/e2e/release-candidate.spec.mjs'),
    readSource('tests/e2e/milestone-9-security.spec.mjs'),
  ]);
  for (const source of [releaseCandidate, security]) {
    assert.match(source, /previewHostname\.startsWith\('deploy-preview-8--'\)/);
    assert.match(source, /sha256-dH\+oOZOdDv\+MWU0F8bCZOoFHX0jFM4\+bwNqOKujbv90=/);
    assert.match(source, /sha256-ikgYIuM\/1wkyZ\+w23wP7pGyeh3RzH5XDMS3MqR2mWrY=/);
    assert.match(source, /Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'/);
    assert.doesNotMatch(source, /\(frame-src\|inline style\)/i);
  }
  assert.match(releaseCandidate, /\[data-netlify-deploy-id\]/);
  assert.match(releaseCandidate, /iframe\[title=\"Netlify Drawer\"\]/);
  assert.match(releaseCandidate, /previewDrawerRemoved/);
  assert.match(security, /applicationInlineStyles/);
});

test('every route cache-busts and still requires the protected release marker', async () => {
  const source = await readSource('tests/e2e/release-candidate.spec.mjs');
  assert.match(source, /function cacheBustedRoute\(route, attempt\)/);
  assert.match(source, /__m10_revision_check/);
  assert.match(source, /page\.goto\(cacheBustedRoute\(route, attempt\)/);
  assert.match(source, /headers\['x-avodah-rc-revision'\] === EXPECTED_MARKER/);
  assert.match(source, /headers\['x-avodah-deploy-context'\] === 'deploy-preview'/);
  assert.match(source, /repeated route checks observe the exact release marker/);
});

test('WebKit screenshots segment below the safe engine threshold and retain evidence metadata', async () => {
  const source = await readSource('tests/e2e/release-candidate.spec.mjs');
  assert.match(source, /WEBKIT_SAFE_SEGMENT_HEIGHT = 12_000/);
  assert.match(source, /fullPageLimit = isWebKit \? WEBKIT_SAFE_SEGMENT_HEIGHT/);
  assert.match(source, /maxSegmentHeight = isWebKit \? WEBKIT_SAFE_SEGMENT_HEIGHT/);
  assert.match(source, /segmentHeight.*toBeLessThanOrEqual\(maxSegmentHeight\)/s);
  assert.match(source, /safeSegmentLimit/);
  assert.match(source, /revision: EXPECTED_COMMIT/);
  assert.match(source, /workflowRun: WORKFLOW_RUN_ID/);
  assert.match(source, /reviewStatus: 'automated-pass'/);
  assert.match(source, /segmentCount/);
});
