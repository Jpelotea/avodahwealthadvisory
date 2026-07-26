import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowUrl = new URL('../../.github/workflows/milestone-12e-required-fields.yml', import.meta.url);
const scriptUrl = new URL('../../scripts/test-milestone-12e-required-fields.mjs', import.meta.url);

test('required-field workflow is frozen-deploy only and cannot deploy', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');
  assert.match(workflow, /EXPECTED_DEPLOY_ID: 6a6655d7af3341b646d4d12f/);
  assert.match(workflow, /RUN_M12E_REQUIRED_FIELDS \$EXPECTED_DEPLOY_ID/);
  assert.match(workflow, /verify-netlify-forms-fixture-http\.mjs/);
  assert.match(workflow, /verify-isolated-form-schemas\.mjs/);
  assert.match(workflow, /test-milestone-12e-required-fields\.mjs/);
  assert.doesNotMatch(workflow, /netlify-cli@.*deploy|netlify deploy|--prod/);
  assert.doesNotMatch(workflow, /if:\s*always\(\)/);
});

test('required-field browser matrix covers every requested Recruitment control without POSTs', async () => {
  const script = await readFile(scriptUrl, 'utf8');
  for (const field of ['full_name','email','mobile_number','location','career_path','employment_status','educational_background','processing_consent']) {
    assert.match(script, new RegExp(`field: '${field}'`));
  }
  assert.match(script, /postRequests === 0/);
  assert.match(script, /recordsCreated: 0/);
  assert.match(script, /validationMessage/);
  assert.match(script, /document\.activeElement === element/);
});
