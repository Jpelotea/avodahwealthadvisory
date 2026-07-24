import assert from 'node:assert/strict';
import test from 'node:test';

const edgeModuleUrl = new URL('../../netlify/edge-functions/site-response.js', import.meta.url);

test('Netlify Edge response module resolves installed dependencies', async () => {
  const edgeModule = await import(edgeModuleUrl);

  assert.equal(typeof edgeModule.default, 'function');
  assert.deepEqual(edgeModule.config, {
    path: '/*',
    excludedPath: ['/api/*', '/.netlify/*'],
    method: 'GET',
    onError: 'bypass',
  });
});
