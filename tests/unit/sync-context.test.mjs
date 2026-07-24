import test from 'node:test';
import assert from 'node:assert/strict';

const moduleUrl = new URL('../../netlify/functions/sync-client-needs.mjs', import.meta.url);

async function loadWithEnv(env) {
  globalThis.Netlify = { env: { get: key => env[key] } };
  return import(`${moduleUrl.href}?case=${Math.random()}`);
}

const event = {
  data: {
    'form-name': 'consultation',
    inquiry_type: 'TEST',
    full_name: 'TEST M6 — Not a Real Client',
    processing_consent: 'Yes',
  },
};

for (const context of ['deploy-preview', 'branch-deploy', 'dev', 'branch']) {
  test(`${context} cannot call downstream fetch`, async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; throw new Error('fetch must not run'); };
    const mod = await loadWithEnv({
      CONTEXT: context,
      GOOGLE_SHEETS_WEBHOOK_URL: 'https://example.invalid',
      GOOGLE_SHEETS_WEBHOOK_SECRET: 'not-a-real-secret',
    });
    await mod.default.formSubmitted(event);
    assert.equal(called, false);
  });
}

test('client-controlled fields cannot override server context', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('fetch must not run'); };
  const mod = await loadWithEnv({ CONTEXT: 'deploy-preview' });
  await mod.default.formSubmitted({ data: { ...event.data, CONTEXT: 'production', context: 'production' } });
  assert.equal(called, false);
});

test('production retains downstream behavior', async () => {
  let called = false;
  globalThis.fetch = async (url, options) => {
    called = true;
    assert.equal(url, 'https://example.invalid');
    assert.equal(options.method, 'POST');
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const mod = await loadWithEnv({
    CONTEXT: 'production',
    GOOGLE_SHEETS_WEBHOOK_URL: 'https://example.invalid',
    GOOGLE_SHEETS_WEBHOOK_SECRET: 'not-a-real-secret',
  });
  await mod.default.formSubmitted(event);
  assert.equal(called, true);
});
