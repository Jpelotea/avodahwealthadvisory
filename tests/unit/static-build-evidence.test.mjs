import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const buildScript = new URL('../../scripts/prepare-static-site.mjs', import.meta.url);

async function runBuild(context) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'avodah-build-evidence-'));
  await writeFile(
    path.join(directory, 'index.html'),
    '<!doctype html><html><head><script async src="https://www.googletagmanager.com/gtag/js?id=G-HV9X54P7NT"></script><script>window.dataLayer=[];function gtag(){dataLayer.push(arguments)};gtag("config","G-HV9X54P7NT")</script></head><body><h1>Test</h1></body></html>',
    'utf8',
  );

  await execFileAsync(process.execPath, [buildScript.pathname], {
    cwd: directory,
    env: {
      ...process.env,
      CONTEXT: context,
      COMMIT_REF: '0123456789abcdef0123456789abcdef01234567',
      DEPLOY_ID: 'deploy-evidence-id',
      BUILD_ID: 'build-evidence-id',
      DEPLOY_URL: 'https://deploy-id--example.netlify.app',
      DEPLOY_PRIME_URL: 'https://deploy-preview-8--example.netlify.app',
      BRANCH: 'agent/blueprint-foundation',
      REVIEW_ID: '8',
    },
  });

  return directory;
}

test('preview build removes static analytics and writes exact release evidence', async () => {
  const directory = await runBuild('deploy-preview');
  try {
    const html = await readFile(path.join(directory, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /googletagmanager\.com\/gtag\/js/i);
    assert.doesNotMatch(html, /gtag\(["']config["']/i);

    const evidence = JSON.parse(await readFile(path.join(directory, 'rc-revision.json'), 'utf8'));
    assert.deepEqual(evidence, {
      releaseMarker: 'm9-definitive-evidence-v1',
      revision: '0123456789abcdef0123456789abcdef01234567',
      deployContext: 'deploy-preview',
      deployId: 'deploy-evidence-id',
      buildId: 'build-evidence-id',
      deployUrl: 'https://deploy-id--example.netlify.app',
      deployPrimeUrl: 'https://deploy-preview-8--example.netlify.app',
      branch: 'agent/blueprint-foundation',
      reviewId: '8',
    });

    const headers = await readFile(path.join(directory, '_headers'), 'utf8');
    assert.match(headers, /X-Robots-Tag: noindex, nofollow, noarchive/);
    assert.match(headers, /\/rc-revision\.json\n  Cache-Control: no-store/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('production build does not generate preview indexing headers', async () => {
  const directory = await runBuild('production');
  try {
    await assert.rejects(readFile(path.join(directory, '_headers'), 'utf8'), error => error?.code === 'ENOENT');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
