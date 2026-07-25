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
const syntheticVerifierUrl = new URL('../../scripts/test-isolated-form-submissions.mjs', import.meta.url);

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

test('evidence workflow emits ready and supports a preflight-only run without browser reruns', async () => {
  const workflow = await readFile(evidenceWorkflowUrl, 'utf8');
  assert.match(workflow, /id: forms-preflight\n\s+run: node scripts\/forms-secret-preflight\.mjs/);
  assert.match(workflow, /status: \$\{\{ steps\.forms-preflight\.outputs\.status \}\}/);
  assert.match(workflow, /if: \$\{\{ !contains\(format\('\{0\} \{1\}', github\.event\.head_commit\.message, github\.event\.pull_request\.title\), '\[preflight-only\]'\) \}\}/);
  assert.doesNotMatch(workflow, /status=configured/);
});

test('isolated deployment is eligible only for exact ready and exact branch head', async () => {
  const workflow = await readFile(isolatedWorkflowUrl, 'utf8');
  assert.match(workflow, /EXPECTED_COMMIT: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /forms-secrets-preflight:\n\s+if: \$\{\{ github\.event_name == 'workflow_dispatch' \|\| contains\(github\.event\.pull_request\.title, '\[run-isolated-forms\]'\) \}\}/);
  assert.match(workflow, /outputs:\n\s+status: \$\{\{ steps\.forms-preflight\.outputs\.status \}\}/);
  assert.match(
    workflow,
    /deploy-and-verify-isolated-forms:\n\s+needs: forms-secrets-preflight\n\s+if: needs\.forms-secrets-preflight\.result == 'success' && needs\.forms-secrets-preflight\.outputs\.status == 'ready'/,
  );
  assert.doesNotMatch(
    workflow,
    /deploy-and-verify-isolated-forms:[\s\S]{0,250}if:\s*always\(\)/,
  );
  assert.ok((workflow.match(/ref: \$\{\{ env\.EXPECTED_COMMIT \}\}/g) || []).length >= 2);
  assert.match(workflow, /revision: process\.env\.EXPECTED_COMMIT/);
  assert.match(workflow, /production-isolation\.json/);
  assert.match(workflow, /fixture-http\.json/);
  assert.match(workflow, /cache-control:\\s\*no-store/i);
  assert.ok(workflow.includes("grep -RnE 'GOOGLE_SHEETS_WEBHOOK"));
  assert.ok(workflow.includes('(^|[^A-Z0-9])G-[A-Z0-9]{6,}([^A-Z0-9]|$)'));
  assert.doesNotMatch(workflow, /grep -RniE/);
});

test('synthetic verifier is fail-closed and records the approved Milestone 11 matrix', async () => {
  const source = await readFile(syntheticVerifierUrl, 'utf8');
  assert.match(source, /const runTag = `M11-TEST-/);
  assert.match(source, /page\.waitForRequest/);
  assert.match(source, /noWaitAfter: true/);
  assert.match(source, /missing required field/);
  assert.match(source, /missing processing consent/);
  assert.match(source, /marketing accepted/);
  assert.match(source, /marketing declined/);
  assert.match(source, /double-click submit/);
  assert.match(source, /same workflow reference resubmission/);
  assert.match(source, /honeypot/);
  assert.match(source, /confirmation route direct access/);
  assert.match(source, /analytics PII and production network isolation/);
  assert.match(source, /fatalError/);
  assert.match(source, /cleanupAction: 'deleted'/);
  assert.doesNotMatch(source, /sessionStorage\.setItem\('m9-last-lead-id'/);
});
