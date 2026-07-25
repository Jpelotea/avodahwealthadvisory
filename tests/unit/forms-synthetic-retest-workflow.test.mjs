import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowUrl = new URL('../../.github/workflows/milestone-11-forms-synthetic-retest.yml', import.meta.url);
const harnessPartUrl = new URL('../../scripts/test-isolated-form-submissions-v2.part-04.mjs', import.meta.url);

test('synthetic-only workflow cannot deploy and retests only the approved clean fixture', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');
  assert.match(workflow, /Milestone 11 Isolated Forms Synthetic Retest/);
  assert.match(workflow, /RUN_ISOLATED_FORMS_SYNTHETIC consultation-recovery 6a65301e791e1b869fe2dc6c/);
  assert.match(workflow, /RETEST_FORM_NAME/);
  assert.match(workflow, /SYNTHETIC_FORM_NAME="\$RETEST_FORM_NAME"/);
  assert.match(workflow, /verify-netlify-forms-fixture-http\.mjs/);
  assert.match(workflow, /verify-isolated-form-schemas\.mjs/);
  assert.doesNotMatch(workflow, /netlify-cli@.*deploy|netlify deploy|--prod/);
  assert.doesNotMatch(workflow, /if:\s*always\(\)/);
});

test('synthetic harness retries transient direct-network failures and labels operations', async () => {
  const source = await readFile(harnessPartUrl, 'utf8');
  assert.match(source, /const nativeFetch = globalThis\.fetch/);
  assert.match(source, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/);
  assert.match(source, /unexpected test-harness exception — \$\{operationName\}/);
  assert.match(source, /\['honeypot', \(\) => verifyHoneypot\(formName\)\]/);
  assert.match(source, /\['confirmation route', \(\) => verifyConfirmationRoute\(formName\)\]/);
});
