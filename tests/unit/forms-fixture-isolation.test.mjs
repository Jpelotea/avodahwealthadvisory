import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateNetlifyAccess } from '../../scripts/forms-netlify-access-check.mjs';

const preflightWorkflow = new URL('../../.github/workflows/milestone-7-form-fixture-deploy.yml', import.meta.url);

test('safe access evidence never includes token material', async () => {
  const token = 'DO-NOT-EXPOSE-ACCESS-TOKEN';
  const result = await evaluateNetlifyAccess({
    environment: {
      FORM_TEST_AUTH_TOKEN: token,
      FORM_TEST_SITE_ID: 'e07260a5-6308-4f68-a41d-d26f267df9ab',
      EXPECTED_FORM_TEST_SITE_ID: 'e07260a5-6308-4f68-a41d-d26f267df9ab',
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          id: 'e07260a5-6308-4f68-a41d-d26f267df9ab',
          name: 'avodah-form-verification-m5',
          published_deploy: { id: 'safe-deploy-id', state: 'ready' },
        };
      },
    }),
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.netlifyAuthenticationSucceeded, true);
  assert.equal(result.isolatedProjectAccessible, true);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
});

test('preflight-only workflow cannot deploy', async () => {
  const workflow = await readFile(preflightWorkflow, 'utf8');
  assert.doesNotMatch(workflow, /netlify-cli@.*deploy|--prod|deploy-and-verify-isolated-forms/);
});
