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

test('preview toolbar CSP exception remains exact-host and exact-signature scoped', async () => {
  const [releaseCandidate, security] = await Promise.all([
    readSource('tests/e2e/release-candidate.spec.mjs'),
    readSource('tests/e2e/milestone-9-security.spec.mjs'),
  ]);
  for (const source of [releaseCandidate, security]) {
    assert.match(source, /previewHostname\.startsWith\('deploy-preview-8--'\)/);
    assert.match(source, /sha256-dH\+oOZOdDv\+MWU0F8bCZOoFHX0jFM4\+bWDqOKujbv90=/);
    assert.doesNotMatch(source, /\(frame-src\|inline style\)/i);
  }
});
