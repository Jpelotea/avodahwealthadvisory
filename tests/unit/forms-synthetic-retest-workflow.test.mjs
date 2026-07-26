import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowUrl = new URL('../../.github/workflows/milestone-11-forms-synthetic-retest.yml', import.meta.url);
const harnessPartUrl = new URL('../../scripts/test-isolated-form-submissions-v2.part-04.mjs', import.meta.url);
const optionHarnessUrl = new URL('../../scripts/test-milestone-12d-form-options.mjs', import.meta.url);

test('synthetic-only workflow cannot deploy and retests only the approved frozen fixture', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');
  assert.match(workflow, /Milestone 11 Isolated Forms Synthetic Retest/);
  assert.match(workflow, /RUN_ISOLATED_FORMS_SYNTHETIC milestone-12e-options 6a6655d7af3341b646d4d12f/);
  assert.match(workflow, /RETEST_FORM_NAME/);
  assert.match(workflow, /test-milestone-12d-form-options\.mjs/);
  assert.match(workflow, /verify-netlify-forms-fixture-http\.mjs/);
  assert.match(workflow, /verify-isolated-form-schemas\.mjs/);
  assert.doesNotMatch(workflow, /netlify-cli@.*deploy|netlify deploy|--prod/);
  assert.doesNotMatch(workflow, /if:\s*always\(\)/);
});

test('synthetic harness retries transient direct-network and rate-limit failures', async () => {
  const source = await readFile(harnessPartUrl, 'utf8');
  const optionsSource = await readFile(optionHarnessUrl, 'utf8');
  assert.match(source, /const nativeFetch = globalThis\.fetch/);
  assert.match(source, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/);
  assert.match(source, /unexpected test-harness exception — \$\{operationName\}/);
  assert.match(source, /\['honeypot', \(\) => verifyHoneypot\(formName\)\]/);
  assert.match(source, /\['confirmation route', \(\) => verifyConfirmationRoute\(formName\)\]/);
  assert.match(optionsSource, /submitWithRateLimitRetry/);
  assert.match(optionsSource, /response\.status !== 429/);
  assert.match(optionsSource, /retry-after/);
  assert.match(optionsSource, /M12D_FORM_RATE_LIMIT_BACKOFF_MS/);
});
