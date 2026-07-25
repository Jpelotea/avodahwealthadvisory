import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = String(process.env.ISOLATED_FORM_URL || '').replace(/\/$/, '');
const siteId = String(process.env.NETLIFY_SITE_ID || '');
const authToken = String(process.env.NETLIFY_AUTH_TOKEN || '');
const outputPath = process.env.SYNTHETIC_FORM_REPORT || 'test-results/forms/synthetic-submissions.json';
const runTag = `M11-TEST-${process.env.GITHUB_RUN_ID || Date.now()}`;
const isolatedHost = baseUrl ? new URL(baseUrl).host : '';
const confirmationPath = '/confirmation.html';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

if (!baseUrl || !siteId || !authToken) {
  throw new Error('ISOLATED_FORM_URL, NETLIFY_SITE_ID, and NETLIFY_AUTH_TOKEN are required.');
}

const formDefinitions = {
  consultation: {
    values: marker => ({
      full_name: `${marker} — NOT A REAL CLIENT`,
      email: 'test-m11@example.invalid',
      mobile_number: '09170000000',
      location: 'TEST LOCATION',
      inquiry_type: 'Financial planning',
      preferred_contact_method: 'Online',
      preferred_schedule: 'Synthetic schedule only',
      message: 'Synthetic Milestone 11 isolated Forms verification',
    }),
    campaign: {
      utm_source: 'm11-isolated-test',
      utm_medium: 'synthetic',
      utm_campaign: 'milestone-11',
      utm_content: 'forms-verification',
      utm_term: 'not-applicable',
      campaign_id: 'M11-CAMPAIGN',
      adset_id: 'M11-ADSET',
      ad_id: 'M11-AD',
      fbclid: 'M11-SYNTHETIC-FBCLID',
    },
  },
  'client-needs-check': {
    values: marker => ({
      primary_need: 'Synthetic financial planning need',
      service_path: 'Synthetic service path',
      full_name: `${marker} — NOT A REAL CLIENT`,
      email: 'test-m11@example.invalid',
      mobile_number: '09170000000',
      location: 'TEST LOCATION',
      preferred_contact_method: 'Online',
      preferred_schedule: 'Synthetic schedule only',
      additional_notes: 'Synthetic Milestone 11 isolated Forms verification',
    }),
  },
  'consultation-recovery': {
    values: marker => ({
      email: 'test-m11@example.invalid',
      workflow_token: `${marker}-NOT-A-REAL-TOKEN`,
    }),
  },
  'client-support': {
    values: marker => ({
      full_name: `${marker} — NOT A REAL CLIENT`,
      email: 'test-m11@example.invalid',
      mobile_number: '09170000000',
      category: 'Policy support',
      description: 'Synthetic Milestone 11 isolated support record',
    }),
  },
  'recruitment-application': {
    values: marker => ({
      full_name: `${marker} — NOT A REAL APPLICANT`,
      email: 'test-m11@example.invalid',
      mobile_number: '09170000000',
      role: 'Synthetic Test Role',
      experience_summary: 'Synthetic Milestone 11 isolated recruitment record',
    }),
  },
  'general-inquiry': {
    values: marker => ({
      full_name: `${marker} — NOT A REAL CLIENT`,
      email: 'test-m11@example.invalid',
      mobile_number: '09170000000',
      subject: 'Synthetic Milestone 11 inquiry',
      message: 'Synthetic Milestone 11 isolated Forms verification',
    }),
  },
};

const results = [];
const cleanup = [];
const browserNetwork = [];
let passed = true;
let fatalError = null;

async function netlifyApi(path, options = {}) {
  const response = await fetch(`https://api.netlify.com/api/v1${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${authToken}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) throw new Error(`Netlify API ${options.method || 'GET'} ${path} failed with ${response.status}`);
  return body;
}

async function listSubmissions(state = 'verified') {
  const query = state === 'verified' ? '' : `?state=${encodeURIComponent(state)}`;
  return await netlifyApi(`/sites/${siteId}/submissions${query}`) || [];
}

async function allSubmissions() {
  return [...await listSubmissions('verified'), ...await listSubmissions('spam')];
}

function submissionContains(submission, marker) {
  return JSON.stringify(submission?.data || {}).includes(marker);
}

async function findSubmission(leadSubmissionId, state = 'verified', attempts = 24) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const submissions = await listSubmissions(state);
    const match = submissions.find(item => item?.data?.lead_submission_id === leadSubmissionId);
    if (match) return match;
    await sleep(2_500);
  }
  return null;
}

async function countMarker(marker) {
  return (await allSubmissions()).filter(item => submissionContains(item, marker)).length;
}

function sensitiveUrlKeys(url) {
  const keys = [...new URL(url).searchParams.keys()];
  const prohibited = new Set([
    'full_name', 'email', 'mobile_number', 'location', 'message', 'description',
    'experience_summary', 'workflow_token', 'lead_submission_id', 'booking_token',
  ]);
  return keys.filter(key => prohibited.has(key));
}

function forbiddenRequestReason(rawUrl) {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  if (url.host === isolatedHost) return '';
  if (/(^|\.)avodahwealthadvisory\.netlify\.app$/i.test(host)) return 'production website';
  if (/(^|\.)(google-analytics\.com|googletagmanager\.com)$/i.test(host)) return 'Google Analytics';
  if (/(^|\.)(facebook\.com|connect\.facebook\.net)$/i.test(host)) return 'Meta Pixel';
  if (/(^|\.)(script\.google\.com|calendar\.google\.com|meet\.google\.com)$/i.test(host)) return 'Google integration';
  return `unexpected external host ${host}`;
}

function recordResult(entry, ok) {
  results.push({ ...entry, result: ok ? 'pass' : 'fail' });
  if (!ok) passed = false;
}

async function fillControl(control, value) {
  const tag = await control.evaluate(element => element.tagName.toLowerCase());
  const type = await control.getAttribute('type');
  if (tag === 'select') await control.selectOption({ label: value });
  else if (type === 'hidden') await control.evaluate((element, next) => { element.value = next; }, value);
  else await control.fill(value);
}

async function prepareForm(page, formName, marker, { marketingAccepted = false, workflowReference } = {}) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const definition = formDefinitions[formName];
  const form = page.locator(`form[name="${formName}"]`);
  const values = definition.values(marker);
  for (const [name, value] of Object.entries(values)) {
    await fillControl(form.locator(`[name="${name}"]`), value);
  }
  for (const [name, value] of Object.entries(definition.campaign || {})) {
    await fillControl(form.locator(`[name="${name}"]`), value);
  }
  await fillControl(form.locator('[name="workflow_reference"]'), workflowReference || `${runTag}-${formName}-${marker}`);
  const processing = form.locator('[name="processing_consent"]');
  const marketing = form.locator('[data-marketing]');
  await processing.check();
  if (marketingAccepted) await marketing.check();
  else await marketing.uncheck();
  return { form, values };
}

async function submitPrepared(page, form) {
  const requestPromise = page.waitForRequest(
    request => request.method() === 'POST' && new URL(request.url()).host === isolatedHost,
    { timeout: 20_000 },
  );
  await form.locator('button[type="submit"],button:not([type])').click({ noWaitAfter: true });
  const request = await requestPromise;
  const posted = new URLSearchParams(request.postData() || '');
  let reachedConfirmation = false;
  try {
    await page.waitForURL(url => url.pathname === confirmationPath, { timeout: 20_000 });
    reachedConfirmation = true;
  } catch {
    await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => {});
  }
  return {
    leadSubmissionId: posted.get('lead_submission_id') || '',
    workflowReference: posted.get('workflow_reference') || '',
    posted: Object.fromEntries(posted.entries()),
    confirmationUrl: page.url(),
    confirmationPath: new URL(page.url()).pathname,
    reachedConfirmation,
  };
}

async function verifyMissingRequired(page, formName) {
  const before = (await allSubmissions()).length;
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const form = page.locator(`form[name="${formName}"]`);
  await form.locator('button[type="submit"],button:not([type])').click();
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('name') || '');
  const control = form.locator(`[name="${focused}"]`);
  const validationMessage = focused ? await control.evaluate(element => element.validationMessage || '') : '';
  const labelText = focused ? await control.evaluate(element => element.labels?.[0]?.textContent?.trim() || '') : '';
  await sleep(1_000);
  const after = (await allSubmissions()).length;
  const ok = Boolean(focused && validationMessage && labelText) && new URL(page.url()).pathname === '/' && before === after;
  recordResult({
    form: formName,
    test: 'missing required field',
    submissionId: null,
    expected: 'blocked, understandable associated error, no record',
    actual: { focused, validationMessage, labelText, path: new URL(page.url()).pathname, submissionDelta: after - before },
    cleanup: 'not applicable',
  }, ok);
}

async function verifyMissingProcessingConsent(page, formName) {
  const marker = `${runTag}-${formName}-NO-PROCESSING`;
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const definition = formDefinitions[formName];
  const form = page.locator(`form[name="${formName}"]`);
  const values = definition.values(marker);
  for (const [name, value] of Object.entries(values)) await fillControl(form.locator(`[name="${name}"]`), value);
  await fillControl(form.locator('[name="workflow_reference"]'), marker);
  await form.locator('[data-marketing]').check();
  const before = await countMarker(marker);
  await form.locator('button[type="submit"],button:not([type])').click();
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('name') || '');
  const retainedName = form.locator('[name="email"]');
  const retained = await retainedName.inputValue();
  await sleep(1_000);
  const after = await countMarker(marker);
  const ok = focused === 'processing_consent' && retained === values.email && before === after;
  recordResult({
    form: formName,
    test: 'missing processing consent',
    submissionId: null,
    expected: 'blocked; marketing does not satisfy processing consent; values retained; no record',
    actual: { focused, retainedEmail: retained, submissionDelta: after - before },
    cleanup: 'not applicable',
  }, ok);
}

async function verifyValidSubmission(page, formName, marketingAccepted) {
  const state = marketingAccepted ? 'MARKETING-ACCEPTED' : 'MARKETING-DECLINED';
  const marker = `${runTag}-${formName}-${state}`;
  const workflowReference = `${runTag}-${formName}-${state}`;
  const { form } = await prepareForm(page, formName, marker, { marketingAccepted, workflowReference });
  const submitted = await submitPrepared(page, form);
  const stored = submitted.leadSubmissionId ? await findSubmission(submitted.leadSubmissionId, 'verified') : null;
  const data = stored?.data || {};
  const timestampValid = !Number.isNaN(Date.parse(data.consent_recorded_at || ''));
  const versionsValid = data.processing_consent_version === 'processing-consent-v1-2026-07-25'
    && data.marketing_consent_version === 'marketing-consent-v1-2026-07-25';
  const campaignValid = formName !== 'consultation'
    || Object.entries(formDefinitions.consultation.campaign).every(([key, value]) => data[key] === value);
  const urlSafe = sensitiveUrlKeys(submitted.confirmationUrl).length === 0;
  const consentSeparated = data.processing_consent === 'Yes'
    && data.consent === 'Yes'
    && data.marketing_consent === (marketingAccepted ? 'Yes' : 'No');
  const ok = submitted.reachedConfirmation
    && submitted.confirmationPath === confirmationPath
    && Boolean(stored)
    && data.workflow_reference === workflowReference
    && consentSeparated
    && timestampValid
    && versionsValid
    && campaignValid
    && urlSafe;

  recordResult({
    form: formName,
    test: marketingAccepted ? 'valid submission — marketing accepted' : 'valid submission — marketing declined',
    submissionId: stored?.id || null,
    expected: {
      confirmationPath,
      processing_consent: 'Yes',
      consent: 'Yes',
      marketing_consent: marketingAccepted ? 'Yes' : 'No',
      workflowReference,
    },
    actual: {
      confirmationPath: submitted.confirmationPath,
      reachedConfirmation: submitted.reachedConfirmation,
      sensitiveUrlKeys: sensitiveUrlKeys(submitted.confirmationUrl),
      processing_consent: data.processing_consent,
      consent: data.consent,
      marketing_consent: data.marketing_consent,
      processing_consent_version: data.processing_consent_version,
      marketing_consent_version: data.marketing_consent_version,
      consent_recorded_at: data.consent_recorded_at,
      workflow_reference: data.workflow_reference,
      campaignFieldsValid: campaignValid,
    },
    cleanup: stored ? 'pending' : 'not found',
  }, ok);

  if (stored) {
    const beforeRefresh = await countMarker(marker);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(1_000);
    const afterRefresh = await countMarker(marker);
    const refreshOk = beforeRefresh === afterRefresh && sensitiveUrlKeys(page.url()).length === 0;
    recordResult({
      form: formName,
      test: 'confirmation refresh',
      submissionId: stored.id,
      expected: 'no resubmission and no sensitive URL data',
      actual: { beforeRefresh, afterRefresh, path: new URL(page.url()).pathname, sensitiveUrlKeys: sensitiveUrlKeys(page.url()) },
      cleanup: 'pending',
    }, refreshOk);

    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
    const backPath = new URL(page.url()).pathname;
    await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => null);
    const forwardPath = new URL(page.url()).pathname;
    const afterNavigation = await countMarker(marker);
    const navigationOk = afterNavigation === afterRefresh
      && sensitiveUrlKeys(page.url()).length === 0
      && [confirmationPath, '/'].includes(backPath)
      && [confirmationPath, '/'].includes(forwardPath);
    recordResult({
      form: formName,
      test: 'Back and Forward navigation',
      submissionId: stored.id,
      expected: 'safe navigation without resubmission',
      actual: { backPath, forwardPath, submissionCount: afterNavigation, sensitiveUrlKeys: sensitiveUrlKeys(page.url()) },
      cleanup: 'pending',
    }, navigationOk);

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    const afterReopen = await countMarker(marker);
    recordResult({
      form: formName,
      test: 'reopen completed form',
      submissionId: stored.id,
      expected: 'form reopens without resubmission',
      actual: { path: new URL(page.url()).pathname, submissionCount: afterReopen },
      cleanup: 'pending',
    }, afterReopen === afterNavigation && new URL(page.url()).pathname === '/');
  }
}

async function verifyDoubleClick(page, formName) {
  const marker = `${runTag}-${formName}-DOUBLE-CLICK`;
  const workflowReference = marker;
  const { form } = await prepareForm(page, formName, marker, { marketingAccepted: false, workflowReference });
  const captured = [];
  const listener = request => {
    if (request.method() === 'POST' && new URL(request.url()).host === isolatedHost) {
      const params = new URLSearchParams(request.postData() || '');
      if (params.get('workflow_reference') === workflowReference) captured.push(params.get('lead_submission_id') || '');
    }
  };
  page.on('request', listener);
  await form.locator('button[type="submit"],button:not([type])').dblclick({ noWaitAfter: true }).catch(() => {});
  await sleep(5_000);
  page.off('request', listener);
  const submissions = (await allSubmissions()).filter(item => item?.data?.workflow_reference === workflowReference);
  const ok = submissions.length <= 1;
  recordResult({
    form: formName,
    test: 'double-click submit',
    submissionId: submissions[0]?.id || null,
    expected: 'no accidental duplicate submission',
    actual: { capturedPostRequests: captured.length, storedSubmissions: submissions.length },
    cleanup: submissions.length ? 'pending' : 'not created',
  }, ok);
}

async function verifySameReferenceResubmission(page, formName) {
  const marker = `${runTag}-${formName}-SAME-REFERENCE`;
  const workflowReference = marker;
  const before = (await allSubmissions()).filter(item => item?.data?.workflow_reference === workflowReference).length;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prepared = await prepareForm(page, formName, `${marker}-${attempt}`, { marketingAccepted: false, workflowReference });
    await submitPrepared(page, prepared.form);
    await sleep(2_000);
  }
  const submissions = (await allSubmissions()).filter(item => item?.data?.workflow_reference === workflowReference);
  recordResult({
    form: formName,
    test: 'same workflow reference resubmission',
    submissionId: submissions[0]?.id || null,
    expected: 'actual Netlify duplicate behavior documented; no idempotency claim',
    actual: {
      before,
      after: submissions.length,
      duplicateRecordsCreated: Math.max(0, submissions.length - before),
      idempotencyImplemented: submissions.length - before <= 1,
      distinguishableLeadSubmissionIds: [...new Set(submissions.map(item => item?.data?.lead_submission_id).filter(Boolean))].length,
    },
    cleanup: submissions.length ? 'pending' : 'not created',
  }, true);
}

async function verifyHoneypot(formName) {
  const marker = `${runTag}-${formName}-HONEYPOT`;
  const definition = formDefinitions[formName];
  const honeypotData = new URLSearchParams({
    'form-name': formName,
    'bot-field': 'synthetic-bot-value',
    ...definition.values(marker),
    ...(definition.campaign || {}),
    processing_consent: 'Yes',
    processing_consent_version: 'processing-consent-v1-2026-07-25',
    marketing_consent: 'No',
    marketing_consent_version: 'marketing-consent-v1-2026-07-25',
    consent: 'Yes',
    consent_recorded_at: new Date().toISOString(),
    lead_submission_id: marker,
    workflow_reference: marker,
  });
  const response = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: honeypotData,
    redirect: 'manual',
  });
  await sleep(3_000);
  const verified = await findSubmission(marker, 'verified', 1);
  const spam = await findSubmission(marker, 'spam', 4);
  const behavior = verified ? 'stored as verified' : spam ? 'classified as spam' : 'silently discarded or rejected';
  recordResult({
    form: formName,
    test: 'honeypot',
    submissionId: spam?.id || verified?.id || null,
    expected: 'not stored as verified',
    actual: { httpStatus: response.status, verified: Boolean(verified), spam: Boolean(spam), behavior },
    cleanup: spam || verified ? 'pending' : 'discarded by Netlify',
  }, !verified);
}

async function verifyConfirmationRoute(page, formName) {
  await page.goto(`${baseUrl}${confirmationPath}`, { waitUntil: 'domcontentloaded' });
  const text = await page.locator('body').innerText();
  const link = page.locator('a[href="/"]');
  const prohibitedClaims = [
    /appointment (is|has been) confirmed/i,
    /administrator (was|has been) notified/i,
    /within \d+ (minutes|hours|days)/i,
  ];
  const ok = /test submission recorded/i.test(text)
    && /no production integration was invoked/i.test(text)
    && await link.count() === 1
    && prohibitedClaims.every(pattern => !pattern.test(text))
    && sensitiveUrlKeys(page.url()).length === 0;
  recordResult({
    form: formName,
    test: 'confirmation route direct access and missing-session fallback',
    submissionId: null,
    expected: 'safe isolated success page with no false promises or sensitive URL data',
    actual: { path: new URL(page.url()).pathname, safeReturnLink: await link.count() === 1, prohibitedClaimsFound: prohibitedClaims.filter(pattern => pattern.test(text)).map(String) },
    cleanup: 'not applicable',
  }, ok);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
context.on('request', request => {
  const postData = request.postData() || '';
  const params = postData ? new URLSearchParams(postData) : null;
  browserNetwork.push({
    method: request.method(),
    url: request.url(),
    resourceType: request.resourceType(),
    submittedFieldNames: params ? [...params.keys()].sort() : [],
    forbiddenReason: forbiddenRequestReason(request.url()),
  });
});
const page = await context.newPage();

try {
  for (const formName of Object.keys(formDefinitions)) {
    for (const operation of [
      () => verifyMissingRequired(page, formName),
      () => verifyMissingProcessingConsent(page, formName),
      () => verifyValidSubmission(page, formName, false),
      () => verifyValidSubmission(page, formName, true),
      () => verifyDoubleClick(page, formName),
      () => verifySameReferenceResubmission(page, formName),
      () => verifyHoneypot(formName),
      () => verifyConfirmationRoute(page, formName),
    ]) {
      try {
        await operation();
      } catch (error) {
        passed = false;
        results.push({
          form: formName,
          test: 'unexpected test-harness exception',
          submissionId: null,
          expected: 'test completes with structured evidence',
          actual: { error: String(error?.message || error) },
          result: 'fail',
          cleanup: 'pending scan',
        });
      }
    }
  }

  const forbiddenRequests = browserNetwork.filter(item => item.forbiddenReason);
  const analyticsRequests = browserNetwork.filter(item => /Google Analytics|Meta Pixel/.test(item.forbiddenReason));
  const externalPiiRequests = forbiddenRequests.filter(item => item.submittedFieldNames.some(name => [
    'full_name', 'email', 'mobile_number', 'location', 'message', 'description',
    'experience_summary', 'workflow_token', 'lead_submission_id',
  ].includes(name)));
  recordResult({
    form: 'all',
    test: 'analytics PII and production network isolation',
    submissionId: null,
    expected: 'no analytics, Meta Pixel, Google integration, production website, or external PII request',
    actual: {
      totalRequests: browserNetwork.length,
      analyticsRequests: analyticsRequests.length,
      forbiddenRequests: forbiddenRequests.map(item => ({ method: item.method, url: item.url, reason: item.forbiddenReason })),
      externalPiiRequests: externalPiiRequests.length,
    },
    cleanup: 'not applicable',
  }, analyticsRequests.length === 0 && forbiddenRequests.length === 0 && externalPiiRequests.length === 0);
} catch (error) {
  fatalError = String(error?.message || error);
  passed = false;
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  let synthetic = [];
  try {
    synthetic = (await allSubmissions()).filter(item => submissionContains(item, runTag));
    for (const submission of synthetic) {
      const formName = submission.form_name || submission.form?.name || submission.data?.['form-name'] || 'unknown';
      const created = submission.created_at || submission.createdAt || null;
      const testPurpose = submission.data?.workflow_reference || 'synthetic Milestone 11 verification';
      try {
        await netlifyApi(`/submissions/${submission.id}`, { method: 'DELETE' });
        cleanup.push({ form: formName, submissionId: submission.id, testPurpose, created, cleanupAction: 'deleted', finalStatus: 'deleted' });
      } catch (error) {
        cleanup.push({ form: formName, submissionId: submission.id, testPurpose, created, cleanupAction: 'delete attempted', finalStatus: 'delete failed', error: String(error?.message || error) });
        passed = false;
      }
    }
  } catch (error) {
    passed = false;
    cleanup.push({ form: 'all', submissionId: null, testPurpose: 'synthetic cleanup scan', created: null, cleanupAction: 'scan attempted', finalStatus: 'scan failed', error: String(error?.message || error) });
  }

  for (const item of results) {
    if (item.submissionId && cleanup.some(entry => entry.submissionId === item.submissionId && entry.finalStatus === 'deleted')) item.cleanup = 'deleted';
  }

  await mkdir('test-results/forms', { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({
    runTag,
    isolatedSite: baseUrl,
    passed,
    fatalError,
    summary: {
      totalTests: results.length,
      passed: results.filter(item => item.result === 'pass').length,
      failed: results.filter(item => item.result === 'fail').length,
      syntheticRecordsFoundForCleanup: synthetic.length,
      syntheticRecordsDeleted: cleanup.filter(item => item.finalStatus === 'deleted').length,
    },
    results,
    browserNetwork,
    cleanup,
  }, null, 2)}\n`, 'utf8');
}

if (!passed) throw new Error(`One or more isolated synthetic form tests failed. See ${outputPath}`);
