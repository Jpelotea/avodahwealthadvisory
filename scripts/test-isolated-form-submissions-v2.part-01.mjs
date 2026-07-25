import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = String(process.env.ISOLATED_FORM_URL || '').replace(/\/$/, '');
const siteId = String(process.env.NETLIFY_SITE_ID || '');
const authToken = String(process.env.NETLIFY_AUTH_TOKEN || '');
const outputPath = process.env.SYNTHETIC_FORM_REPORT || 'test-results/forms/synthetic-submissions.json';
const runTag = `M11-TEST-${process.env.GITHUB_RUN_ID || Date.now()}`;
const isolatedHost = baseUrl ? new URL(baseUrl).host : '';
const confirmationPaths = new Set(['/confirmation', '/confirmation.html']);
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
const pendingValid = [];
const pendingDoubleClick = [];
const pendingSameReference = [];
const pendingHoneypot = [];
let passed = true;
let fatalError = null;

function recordResult(entry, ok) {
  results.push({ ...entry, result: ok ? 'pass' : 'fail' });
  if (!ok) passed = false;
}

function isConfirmationPath(pathname) {
  return confirmationPaths.has(pathname);
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
  if (/(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|g\.doubleclick\.net)$/i.test(host)) return 'Google Analytics';
  if (/(^|\.)(facebook\.com|connect\.facebook\.net)$/i.test(host)) return 'Meta Pixel';
  if (/(^|\.)(script\.google\.com|calendar\.google\.com|meet\.google\.com)$/i.test(host)) return 'Google integration';
  return `unexpected external host ${host}`;
}

async function netlifyApi(apiPath, options = {}) {
  const response = await fetch(`https://api.netlify.com/api/v1${apiPath}`, {
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
  if (!response.ok) {
    throw new Error(`Netlify API ${options.method || 'GET'} ${apiPath} failed with ${response.status}`);
  }
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

async function gotoWithRetry(page, url, { attempts = 3 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 45_000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1_500 * attempt);
    }
  }
  throw lastError;
}

async function withPage(context, operation) {
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(45_000);
  try {
    return await operation(page);
  } finally {
    await page.close().catch(() => {});
  }
}

async function fillControl(control, value) {
  const tag = await control.evaluate(element => element.tagName.toLowerCase());
  const type = await control.getAttribute('type');
  if (tag === 'select') await control.selectOption({ label: value });
  else if (type === 'hidden') await control.evaluate((element, next) => { element.value = next; }, value);
  else await control.fill(value);
}

async function prepareForm(page, formName, marker, { marketingAccepted = false, workflowReference } = {}) {
  await gotoWithRetry(page, baseUrl);
  const definition = formDefinitions[formName];
  const form = page.locator(`form[name="${formName}"]`);
  const values = definition.values(marker);
  for (const [name, value] of Object.entries(values)) {
    await fillControl(form.locator(`[name="${name}"]`), value);
  }
  for (const [name, value] of Object.entries(definition.campaign || {})) {
    await fillControl(form.locator(`[name="${name}"]`), value);
  }
  await fillControl(
    form.locator('[name="workflow_reference"]'),
    workflowReference || `${runTag}-${formName}-${marker}`,
  );
  await form.locator('[name="processing_consent"]').check();
  const marketing = form.locator('[data-marketing]');
  if (marketingAccepted) await marketing.check();
  else await marketing.uncheck();
  return { form, values };
}

async function submitPrepared(page, form) {
  const requestPromise = page.waitForRequest(
    request => request.method() === 'POST' && new URL(request.url()).host === isolatedHost,
    { timeout: 30_000 },
  );
  await form.locator('button[type="submit"],button:not([type])').click({ noWaitAfter: true });
  const request = await requestPromise;
  const posted = new URLSearchParams(request.postData() || '');
  let reachedConfirmation = false;
  try {
    await page.waitForURL(url => isConfirmationPath(url.pathname), { timeout: 45_000 });
    reachedConfirmation = true;
  } catch {
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
    reachedConfirmation = isConfirmationPath(new URL(page.url()).pathname);
  }
  return {
    leadSubmissionId: posted.get('lead_submission_id') || '',
    workflowReference: posted.get('workflow_reference') || '',
    posted: Object.fromEntries(posted.entries()),
    confirmationUrl: page.url(),
    confirmationPath: new URL(page.url()).pathname,
    reachedConfirmation,
  };
