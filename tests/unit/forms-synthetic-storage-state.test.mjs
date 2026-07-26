import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const harnessPart = new URL('../../scripts/test-isolated-form-submissions-v2.part-03.mjs', import.meta.url);

test('synthetic Forms evidence verifies both Netlify verified and spam storage states', async () => {
  const source = await readFile(harnessPart, 'utf8');
  assert.match(source, /\[\.\.\.verified, \.\.\.spam\]/);
  assert.match(source, /const storedRecords = \[\.\.\.verified, \.\.\.spam\]/);
  assert.match(source, /storageState: verifiedIds\.has/);
  assert.match(source, /const submissions = storedRecords\.filter/);
  assert.doesNotMatch(source, /const matchingSubmissions = verified\.filter/);
});
