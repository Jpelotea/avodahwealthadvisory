import assert from 'node:assert/strict';
import test from 'node:test';

const edgeModuleUrl = new URL('../../netlify/edge-functions/site-response.js', import.meta.url);

test('Netlify Edge response module stays dependency-free and exposes static config', async () => {
  const edgeModule = await import(`${edgeModuleUrl.href}?config=${Math.random()}`);

  assert.equal(typeof edgeModule.default, 'function');
  assert.deepEqual(edgeModule.config, {
    path: '/*',
    excludedPath: ['/api/*', '/.netlify/*', '/rc-revision.json'],
    method: 'GET',
    onError: 'bypass',
  });
});

test('Edge health uses Netlify runtime deploy context and deploy ID', async () => {
  const edgeModule = await import(`${edgeModuleUrl.href}?health=${Math.random()}`);
  const response = await edgeModule.default(
    new Request('https://deploy-preview-8--example.netlify.app/edge-health.json'),
    {
      deploy: { context: 'deploy-preview', id: 'deploy-test-id' },
      next: async () => { throw new Error('context.next must not run for health endpoint'); },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    status: 'ok',
    releaseMarker: 'm9-definitive-evidence-v1',
    deployContext: 'deploy-preview',
    deployId: 'deploy-test-id',
  });
});

test('preview HTML receives release, deploy, and noindex headers', async () => {
  const edgeModule = await import(`${edgeModuleUrl.href}?html=${Math.random()}`);
  const response = await edgeModule.default(
    new Request('https://deploy-preview-8--example.netlify.app/'),
    {
      deploy: { context: 'deploy-preview', id: 'deploy-html-id' },
      next: async () => new Response('<!doctype html><html><head><title>Test</title></head><body><h1>Test</h1></body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': '123' },
      }),
    },
  );

  assert.equal(response.headers.get('x-avodah-deploy-context'), 'deploy-preview');
  assert.equal(response.headers.get('x-avodah-deploy-id'), 'deploy-html-id');
  assert.equal(response.headers.get('x-avodah-rc-revision'), 'm9-definitive-evidence-v1');
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/i);
  assert.equal(response.headers.has('content-length'), false);
  assert.match(await response.text(), /<meta name="robots" content="noindex,nofollow,noarchive">/);
});
