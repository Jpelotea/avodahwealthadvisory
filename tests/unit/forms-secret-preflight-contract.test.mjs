import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { APPROVED_ISOLATED_SITE_ID, evaluateFormsSecretEnvironment, evaluateFormsSecretPreflight } from '../../scripts/forms-secret-preflight.mjs';

const preflightWorkflowUrl = new URL('../../.github/workflows/milestone-7-form-fixture-deploy.yml', import.meta.url);
const deploymentWorkflowUrl = new URL('../../.github/workflows/milestone-11-forms-fixture-deploy.yml', import.meta.url);
const cases = [[true,true,true,'ready'],[false,true,true,'blocked'],[true,false,false,'blocked'],[true,true,false,'blocked'],[false,false,false,'blocked']];
for (const [authTokenSecretPresent, siteIdSecretPresent, siteIdMatchesIsolatedProject, expectedStatus] of cases) {
  test(`preflight status is ${expectedStatus} for token=${authTokenSecretPresent}, site=${siteIdSecretPresent}, match=${siteIdMatchesIsolatedProject}`, () => {
    const result = evaluateFormsSecretPreflight({ authTokenSecretPresent, siteIdSecretPresent, siteIdMatchesIsolatedProject });
    assert.equal(result.status, expectedStatus);
    assert.equal(result.expectedSiteId, APPROVED_ISOLATED_SITE_ID);
  });
}
test('unexpected validation errors fail closed', () => {
  assert.equal(evaluateFormsSecretPreflight({ authTokenSecretPresent:true, siteIdSecretPresent:true, siteIdMatchesIsolatedProject:true, validationError:true }).status, 'blocked');
});
test('environment evidence never exposes token material', () => {
  const secret='DO-NOT-EXPOSE-THIS-TEST-TOKEN';
  const result=evaluateFormsSecretEnvironment({FORM_TEST_AUTH_TOKEN:secret,FORM_TEST_SITE_ID:APPROVED_ISOLATED_SITE_ID,EXPECTED_FORM_TEST_SITE_ID:APPROVED_ISOLATED_SITE_ID});
  assert.equal(result.status,'ready');
  assert.doesNotMatch(JSON.stringify(result),new RegExp(secret));
});
test('preflight workflow has no deployment path', async () => {
  const workflow=await readFile(preflightWorkflowUrl,'utf8');
  assert.match(workflow,/Milestone 11 Forms Preflight and Access/);
  assert.match(workflow,/forms-netlify-access-check\.mjs/);
  assert.doesNotMatch(workflow,/netlify-cli@.*deploy|--prod|deploy-and-verify-isolated-forms/);
});
test('deployment workflow runs its own exact gates after a separate explicit request', async () => {
  const workflow=await readFile(deploymentWorkflowUrl,'utf8');
  assert.match(workflow,/RUN_ISOLATED_FORMS_FIXTURE/);
  assert.match(workflow,/needs: explicit-fixture-deployment-trigger/);
  assert.match(workflow,/if: needs\.explicit-fixture-deployment-trigger\.outputs\.eligible == 'true'/);
  assert.match(workflow,/node scripts\/forms-secret-preflight\.mjs/);
  assert.match(workflow,/node scripts\/forms-netlify-access-check\.mjs/);
  assert.match(workflow,/secret\.status !== 'ready'/);
  assert.match(workflow,/access\.status !== 'ready'/);
  assert.doesNotMatch(workflow,/if:\s*always\(\)/);
});
