import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspectFixture, EXPECTED_FORMS } from '../../scripts/inspect-netlify-forms-fixture.mjs';
import { evaluateNetlifyAccess } from '../../scripts/forms-netlify-access-check.mjs';
import { verifyHttpIsolation } from '../../scripts/verify-netlify-forms-fixture-http.mjs';

const preflightWorkflow = new URL('../../.github/workflows/milestone-7-form-fixture-deploy.yml', import.meta.url);
const deploymentWorkflow = new URL('../../.github/workflows/milestone-11-forms-fixture-deploy.yml', import.meta.url);
const syntheticHarnessParts = [
  new URL('../../scripts/test-isolated-form-submissions-v2.part-01.mjs', import.meta.url),
  new URL('../../scripts/test-isolated-form-submissions-v2.part-02.mjs', import.meta.url),
  new URL('../../scripts/test-isolated-form-submissions-v2.part-03.mjs', import.meta.url),
  new URL('../../scripts/test-isolated-form-submissions-v2.part-04.mjs', import.meta.url),
];
const syntheticHarnessRunner = new URL('../../scripts/run-isolated-form-submissions-v2.mjs', import.meta.url);
const syntheticHarnessEntrypoint = new URL('../../scripts/test-isolated-form-submissions.mjs', import.meta.url);

test('dedicated fixture configuration and source inventory are production-isolated', async () => {
  const report=await inspectFixture();
  assert.equal(report.passed,true);
  assert.deepEqual(report.detectedForms,EXPECTED_FORMS);
  assert.deepEqual(report.missingForms,[]);
  assert.deepEqual(report.unexpectedForms,[]);
  assert.equal(report.checks.noRedirectConfig,true);
  assert.equal(report.checks.noFunctionsConfig,true);
  assert.equal(report.checks.strictCspExact,true);
  assert.equal(report.checks.inlineHashesMatch,true);
  assert.equal(report.checks.unsafeInlineAbsent,true);
});

test('preflight cannot deploy and fixture deployment requires a separate explicit request', async () => {
  const preflight=await readFile(preflightWorkflow,'utf8');
  const deployment=await readFile(deploymentWorkflow,'utf8');
  assert.doesNotMatch(preflight,/netlify-cli@.*deploy|--prod|deploy-and-verify-isolated-forms/);
  assert.match(deployment,/workflow_dispatch:/);
  assert.match(deployment,/\.github\/forms-fixture-deploy-request/);
  assert.match(deployment,/\[run-forms-fixture\]/);
  assert.match(deployment,/\$RUNNER_TEMP\/m11-netlify-forms-fixture/);
  assert.match(deployment,/cp .*FIXTURE_CONFIG.*netlify\.toml/);
  assert.match(deployment,/--dir=dist/);
  assert.doesNotMatch(deployment,/cd qa\/form-fixture/);
  assert.doesNotMatch(deployment,/if:\s*always\(\)/);
});

test('safe access evidence never includes token material', async () => {
  const token='DO-NOT-EXPOSE-ACCESS-TOKEN';
  const result=await evaluateNetlifyAccess({environment:{FORM_TEST_AUTH_TOKEN:token,FORM_TEST_SITE_ID:'e07260a5-6308-4f68-a41d-d26f267df9ab',EXPECTED_FORM_TEST_SITE_ID:'e07260a5-6308-4f68-a41d-d26f267df9ab'},fetchImpl:async()=>({ok:true,status:200,async json(){return{id:'e07260a5-6308-4f68-a41d-d26f267df9ab',name:'avodah-form-verification-m5',published_deploy:{id:'safe-deploy-id',state:'ready'}};}})});
  assert.equal(result.status,'ready');
  assert.doesNotMatch(JSON.stringify(result),new RegExp(token));
});

test('runtime and HTTP gate accepts only zero-runtime strict fixture responses', async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'m11-http-'));
  try {
    const root=path.join(dir,'forms'); await mkdir(root,{recursive:true});
    await writeFile(path.join(root,'deploy-status-raw.json'),JSON.stringify({state:'ready',site_id:'e07260a5-6308-4f68-a41d-d26f267df9ab',available_functions:[],edge_functions_present:false,summary:{messages:[{title:'1 header rule processed'}]}}));
    await writeFile(path.join(root,'deploy-safe.json'),JSON.stringify({isolatedSiteId:'e07260a5-6308-4f68-a41d-d26f267df9ab'}));
    await writeFile(path.join(root,'fixture-inventory.json'),JSON.stringify({publishedFiles:['index.html','confirmation.html'],checks:{productionEnvironmentReferencesAbsent:true}}));
    await writeFile(path.join(root,'fixture-response-body.html'),'<meta name="robots" content="noindex,nofollow,noarchive"><div>TEST ENVIRONMENT — SYNTHETIC DATA ONLY</div>');
    await writeFile(path.join(root,'fixture-response-headers.txt'),['HTTP/2 200','x-robots-tag: noindex, nofollow, noarchive','cache-control: no-store','referrer-policy: no-referrer',"content-security-policy: default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'sha256-UBEM9fc6mr/QFtxsjMEiHUkqNJwq2BWrDJ2hXnKxpY4='; script-src 'self' 'sha256-aAd2Tn6ICOO7lGhHJHaPanNU21uWI478tE+9d9Hltjk='",'x-content-type-options: nosniff',''].join('\n'));
    const report=await verifyHttpIsolation({deployStatusPath:path.join(root,'deploy-status-raw.json'),deploySafePath:path.join(root,'deploy-safe.json'),headersPath:path.join(root,'fixture-response-headers.txt'),bodyPath:path.join(root,'fixture-response-body.html'),inventoryPath:path.join(root,'fixture-inventory.json'),outputPath:path.join(root,'http-isolation.json')});
    assert.equal(report.passed,true); assert.equal(report.effectiveRedirectRules,0); assert.equal(report.netlifyFunctionsCount,0); assert.equal(report.edgeFunctionsCount,0);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('synthetic harness accepts canonical Netlify confirmation routes and isolates page state', async () => {
  const harness=(await Promise.all(syntheticHarnessParts.map(part=>readFile(part,'utf8')))).join('');
  const runner=await readFile(syntheticHarnessRunner,'utf8');
  const entrypoint=await readFile(syntheticHarnessEntrypoint,'utf8');
  assert.match(harness,/new Set\(\['\/confirmation', '\/confirmation\.html'\]\)/);
  assert.match(harness,/function isConfirmationPath\(pathname\)/);
  assert.match(harness,/async function withPage\(context, operation\)/);
  assert.match(harness,/async function pollForSyntheticSubmissions/);
  assert.match(harness,/await fetch\(`\$\{baseUrl\}\$\{route\}`/);
  assert.match(harness,/pendingDoubleClick\.filter\(item => item\.capturedPostRequests > 0\)/);
  assert.doesNotMatch(harness,/const confirmationPath = '\/confirmation\.html'/);
  assert.doesNotMatch(harness,/const page = await context\.newPage\(\);\s*try\s*\{\s*for \(const formName/s);
  assert.match(runner,/--check/);
  assert.match(entrypoint,/run-isolated-form-submissions-v2\.mjs/);
  assert.match(runner,/test-isolated-form-submissions-v2\.part-01\.mjs/);
});
