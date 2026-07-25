import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  APPROVED_ISOLATED_SITE_ID,
  evaluateFormsSecretEnvironment,
  evaluateFormsSecretPreflight,
} from '../../scripts/forms-secret-preflight.mjs';

const evidenceWorkflowUrl = new URL('../../.github/workflows/milestone-6-browser-qa.yml', import.meta.url);
const isolatedWorkflowUrl = new URL('../../.github/workflows/milestone-7-form-fixture-deploy.yml', import.meta.url);

const cases = [
  [true, true, true, 'ready'],
  [false, true, true, 'blocked'],
  [true, false, false, 'blocked'],
  [true, true, false, 'blocked'],
  [false, false, false, 'blocked'],
];

for (const [authTokenSecretPresent, siteIdSecretPresent, siteIdMatchesIsolatedProject, expectedStatus] of cases) {
  test(`preflight status is ${expectedStatus} for token=${authTokenSecretPresent}, site=${siteIdSecretPresent}, match=${siteIdMatchesIsolatedProject}`, () => {
    const result = evaluateFormsSecretPreflight({
      authTokenSecretPresent,
      siteIdSecretPresent,
      siteIdMatchesIsolatedProject,
    });
    assert.equal(result.status, expectedStatus);
    assert.equal(result.expectedSiteId, APPROVED_ISOLATED_SITE_ID);
  });
}

test('unexpected validation errors fail closed', () => {
  assert.equal(
    evaluateFormsSecretPreflight({
      authTokenSecretPresent: true,
      siteIdSecretPresent: true,
      siteIdMatchesIsolatedProject: true,
      validationError: true,
    }).status,
    'blocked',
  );
});

test('environment evaluation emits only safe status and boolean evidence', () => {
  const secret = 'DO-NOT-EXPOSE-THIS-TEST-TOKEN';
  const result = evaluateFormsSecretEnvironment({
    FORM_TEST_AUTH_TOKEN: secret,
    FORM_TEST_SITE_ID: APPROVED_ISOLATED_SITE_ID,
    EXPECTED_FORM_TEST_SITE_ID: APPROVED_ISOLATED_SITE_ID,
  });

  assert.deepEqual(result, {
    status: 'ready',
    authTokenSecretPresent: true,
    siteIdSecretPresent: true,
    siteIdMatchesIsolatedProject: true,
    expectedSiteId: APPROVED_ISOLATED_SITE_ID,
  });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
  assert.deepEqual(Object.keys(result).sort(), [
    'authTokenSecretPresent',
    'expectedSiteId',
    'siteIdMatchesIsolatedProject',
    'siteIdSecretPresent',
    'status',
  ]);
});

test('evidence workflow emits ready and supports a preflight-only push without browser reruns', async () => {
  const workflow = await readFile(evidenceWorkflowUrl, 'utf8');
  assert.match(workflow, /id: forms-preflight\n\s+run: node scripts\/forms-secret-preflight\.mjs/);
  assert.match(workflow, /status: \$\{\{ steps\.forms-preflight\.outputs\.status \}\}/);
  assert.match(workflow, /contains\(github\.event\.head_commit\.message, '\[preflight-only\]'\)/);
  assert.doesNotMatch(workflow, /status=configured/);
});

test('isolated deployment is eligible only for the exact ready state', async () => {
  const workflow = await readFile(isolatedWorkflowUrl, 'utf8');
  assert.match(workflow, /forms-secrets-preflight:/);
  assert.match(workflow, /outputs:\n\s+status: \$\{\{ steps\.forms-preflight\.outputs\.status \}\}/);
  assert.match(
    workflow,
    /deploy-and-verify-isolated-forms:\n\s+needs: forms-secrets-preflight\n\s+if: needs\.forms-secrets-preflight\.result == 'success' && needs\.forms-secrets-preflight\.outputs\.status == 'ready'/,
  );
  assert.doesNotMatch(
    workflow,
    /deploy-and-verify-isolated-forms:[\s\S]{0,250}if:\s*always\(\)/,
  );
});
