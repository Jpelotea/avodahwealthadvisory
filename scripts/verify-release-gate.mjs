import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = String(process.env.PLAYWRIGHT_BASE_URL || '').replace(/\/$/, '');
const expectedCommit = String(process.env.EXPECTED_COMMIT || '');
const expectedMarker = String(process.env.EXPECTED_RC_REVISION || '');
const outputKey = String(process.env.GATE_OUTPUT_KEY || 'browser');
const outputPaths = {
  browser: 'test-results/evidence/release-gate.json',
  lighthouse: 'test-results/lighthouse/release-gate.json',
};
const outputPath = outputPaths[outputKey];
const maxAttempts = Number(process.env.GATE_ATTEMPTS || 60);
const delayMs = Number(process.env.GATE_DELAY_MS || 10_000);

if (!baseUrl || !expectedCommit || !expectedMarker) {
  throw new Error('PLAYWRIGHT_BASE_URL, EXPECTED_COMMIT, and EXPECTED_RC_REVISION are required.');
}
if (!outputPath) throw new Error(`Unsupported GATE_OUTPUT_KEY: ${outputKey}`);

const target = new URL(baseUrl);
if (target.hostname === 'avodahwealthadvisory.netlify.app' || !target.hostname.startsWith('deploy-preview-8--')) {
  throw new Error(`Refusing non-preview target: ${target.hostname}`);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalized = value => String(value || '').replace(/\/$/, '');
const requestHeaders = {
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent': 'Avodah-Milestone-9-QA',
};

async function fetchJson(url) {
  const response = await fetch(url, { headers: requestHeaders, redirect: 'manual' });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { parseError: true, text: text.slice(0, 500) };
  }
  return { response, body };
}

const attempts = [];
let passed = false;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const cacheBust = `${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || '1'}-${attempt}-${Date.now()}`;
  const record = { attempt, checkedAt: new Date().toISOString(), baseUrl };

  try {
    const root = await fetch(`${baseUrl}/?qa_gate=${cacheBust}`, { headers: requestHeaders, redirect: 'manual' });
    const release = await fetchJson(`${baseUrl}/rc-revision.json?qa_gate=${cacheBust}`);
    const edge = await fetchJson(`${baseUrl}/edge-health.json?qa_gate=${cacheBust}`);

    const rootHeaders = Object.fromEntries(root.headers.entries());
    const releaseBody = release.body || {};
    const edgeBody = edge.body || {};
    const deployId = String(releaseBody.deployId || '');

    Object.assign(record, {
      root: {
        status: root.status,
        releaseMarker: rootHeaders['x-avodah-rc-revision'] || '',
        deployContext: rootHeaders['x-avodah-deploy-context'] || '',
        deployId: rootHeaders['x-avodah-deploy-id'] || '',
        robots: rootHeaders['x-robots-tag'] || '',
      },
      releaseEndpoint: {
        status: release.response.status,
        ...releaseBody,
      },
      edgeHealth: {
        statusCode: edge.response.status,
        ...edgeBody,
      },
    });

    const checks = {
      rootStatus: root.status === 200,
      rootNoindex: /noindex/i.test(record.root.robots),
      rootMarker: record.root.releaseMarker === expectedMarker,
      rootContext: record.root.deployContext === 'deploy-preview',
      releaseStatus: release.response.status === 200,
      exactCommit: releaseBody.revision === expectedCommit,
      releaseMarker: releaseBody.releaseMarker === expectedMarker,
      releaseContext: releaseBody.deployContext === 'deploy-preview',
      aliasMatches: normalized(releaseBody.deployPrimeUrl) === baseUrl,
      immutableUrlPresent: /^https:\/\//.test(String(releaseBody.deployUrl || '')),
      deployIdPresent: deployId.length >= 10 && deployId !== 'local',
      edgeStatus: edge.response.status === 200 && edgeBody.status === 'ok',
      edgeMarker: edgeBody.releaseMarker === expectedMarker,
      edgeContext: edgeBody.deployContext === 'deploy-preview',
      edgeDeployId: edgeBody.deployId === deployId,
      rootDeployId: record.root.deployId === deployId,
    };

    record.checks = checks;
    record.passed = Object.values(checks).every(Boolean);
    attempts.push(record);

    console.log(`attempt=${attempt} commit=${releaseBody.revision || ''} marker=${releaseBody.releaseMarker || ''} context=${releaseBody.deployContext || ''} deploy=${deployId} edge=${edgeBody.status || ''} noindex=${record.root.robots || ''} passed=${record.passed}`);

    if (record.passed) {
      passed = true;
      break;
    }
  } catch (error) {
    record.error = String(error?.stack || error);
    record.passed = false;
    attempts.push(record);
    console.log(`attempt=${attempt} error=${String(error?.message || error)}`);
  }

  if (attempt < maxAttempts) await sleep(delayMs);
}

const evidence = {
  expectedCommit,
  expectedMarker,
  target: baseUrl,
  passed,
  final: attempts.at(-1) || null,
  attempts,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

if (!passed) {
  throw new Error(`Deploy Preview did not satisfy the exact Milestone 9 release gate. Evidence: ${outputPath}`);
}
