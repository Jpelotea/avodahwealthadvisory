import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = String(process.env.ISOLATED_FORM_URL || '').replace(/\/$/, '');
const siteId = String(process.env.NETLIFY_SITE_ID || '');
const authToken = String(process.env.NETLIFY_AUTH_TOKEN || '');
const outputPath = process.env.SYNTHETIC_FORM_REPORT || 'test-results/forms/synthetic-submissions.json';
const runTag = `TEST-M9-${process.env.GITHUB_RUN_ID || Date.now()}`;

if (!baseUrl || !siteId || !authToken) {
  throw new Error('ISOLATED_FORM_URL, NETLIFY_SITE_ID, and NETLIFY_AUTH_TOKEN are required.');
}

const forms = {
  consultation: {
    values: {
      full_name: `${runTag} — NOT A REAL CLIENT`,
      email: `test-m9-${process.env.GITHUB_RUN_ID || 'local'}@example.invalid`,
      mobile_number: '09170000000',
      location: 'Synthetic Test Province',
      inquiry_type: 'Financial planning',
      preferred_contact_method: 'Online',
      preferred_schedule: 'Synthetic schedule only',
      message: 'Synthetic Milestone 9 form-verification record',
    },
  },
  'client-needs-check': {
    values: {
      primary_need: 'Synthetic financial planning need',
      service_path: 'Synthetic service path',
      full_name: `${runTag} — NOT A REAL CLIENT`,
      email: `test-m9-${process.env.GITHUB_RUN_ID || 'local'}@example.invalid`,
      mobile_number: '09170000000',
      location: 'Synthetic Test Province',
      preferred_contact_method: 'Online',
      preferred_schedule: 'Synthetic schedule only',
      additional_notes: 'Synthetic Milestone 9 form-verification record',
    },
  },
  'consultation-recovery': {
    values: {
      email: `test-m9-${process.env.GITHUB_RUN_ID || 'local'}@example.invalid`,
      workflow_token: `${runTag}-RECOVERY-TOKEN`,
    },
  },
  'client-support': {
    values: {
      full_name: `${runTag} — NOT A REAL CLIENT`,
      email: `test-m9-${process.env.GITHUB_RUN_ID || 'local'}@example.invalid`,
      mobile_number: '09170000000',
      category: 'Policy support',
      description: 'Synthetic Milestone 9 support record',
    },
  },
  'recruitment-application': {
    values: {
      full_name: `${runTag} — NOT A REAL APPLICANT`,
      email: `test-m9-${process.env.GITHUB_RUN_ID || 'local'}@example.invalid`,
      mobile_number: '09170000000',
      role: 'Synthetic Test Role',
      experience_summary: 'Synthetic Milestone 9 recruitment record',
    },
  },
  'general-inquiry': {
    values: {
      full_name: `${runTag} — NOT A REAL CLIENT`,
      email: `test-m9-${process.env.GITHUB_RUN_ID || 'local'}@example.invalid`,
      mobile_number: '09170000000',
      subject: 'Synthetic Milestone 9 inquiry',
      message: 'Synthetic Milestone 9 form-verification record',
    },
  },
};

const results = [];
const cleanup = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

function containsRunTag(submission) {
  return JSON.stringify(submission?.data || {}).includes(runTag);
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

async function fillForm(page, formName, values) {
  const form = page.locator(`form[name="${formName}"]`);
  for (const [name, value] of Object.entries(values)) {
    const control = form.locator(`[name="${name}"]`);
    const tag = await control.evaluate(element => element.tagName.toLowerCase());
    if (tag === 'select') await control.selectOption({ label: value });
    else await control.fill(value);
  }
  return form;
}

async function submitValid(page, formName, values, marketingAccepted) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const form = await fillForm(page, formName, values);
  await form.locator('[name="processing_consent"]').check();
  const marketing = form.locator('[data-marketing]');
  if (marketingAccepted) await marketing.check();
  else await marketing.uncheck();

  await form.evaluate(element => {
    element.addEventListener('submit', () => {
      sessionStorage.setItem('m9-last-lead-id', element.querySelector('[name="lead_submission_id"]')?.value || '');
    }, { once: true });
  });

  await Promise.all([
    page.waitForURL(url => url.pathname === '/confirmation.html', { timeout: 30_000 }),
    form.locator('button[type="submit"],button:not([type])').click(),
  ]);
  const leadSubmissionId = await page.evaluate(() => sessionStorage.getItem('m9-last-lead-id'));
  return { leadSubmissionId, confirmationPath: new URL(page.url()).pathname };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let passed = true;

try {
  for (const [formName, definition] of Object.entries(forms)) {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    const emptyForm = page.locator(`form[name="${formName}"]`);
    await emptyForm.locator('button[type="submit"],button:not([type])').click();
    const firstInvalid = await page.evaluate(() => document.activeElement?.getAttribute('name') || '');
    const missingRequiredPassed = firstInvalid !== '' && new URL(page.url()).pathname === '/';
    results.push({ form: formName, test: 'missing required field', submissionId: null, expected: 'blocked and first invalid field focused', actual: { firstInvalid, path: new URL(page.url()).pathname }, result: missingRequiredPassed ? 'pass' : 'fail', cleanup: 'not applicable' });
    if (!missingRequiredPassed) passed = false;

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    const consentForm = await fillForm(page, formName, definition.values);
    await consentForm.locator('button[type="submit"],button:not([type])').click();
    const consentInvalid = await page.evaluate(() => document.activeElement?.getAttribute('name') || '');
    const missingConsentPassed = consentInvalid === 'processing_consent' && new URL(page.url()).pathname === '/';
    results.push({ form: formName, test: 'missing processing consent', submissionId: null, expected: 'blocked and processing consent focused', actual: { firstInvalid: consentInvalid, path: new URL(page.url()).pathname }, result: missingConsentPassed ? 'pass' : 'fail', cleanup: 'not applicable' });
    if (!missingConsentPassed) passed = false;

    for (const marketingAccepted of [false, true]) {
      const label = marketingAccepted ? 'marketing accepted' : 'marketing declined';
      const submitted = await submitValid(page, formName, definition.values, marketingAccepted);
      const stored = await findSubmission(submitted.leadSubmissionId, 'verified');
      const storedData = stored?.data || {};
      const consentSeparated = storedData.processing_consent === 'Yes' && storedData.consent === 'Yes' && storedData.marketing_consent === (marketingAccepted ? 'Yes' : 'No');
      const validPassed = submitted.confirmationPath === '/confirmation.html' && Boolean(stored) && consentSeparated;
      results.push({
        form: formName,
        test: label,
        submissionId: stored?.id || null,
        expected: { confirmationPath: '/confirmation.html', processing_consent: 'Yes', consent: 'Yes', marketing_consent: marketingAccepted ? 'Yes' : 'No' },
        actual: { confirmationPath: submitted.confirmationPath, processing_consent: storedData.processing_consent, consent: storedData.consent, marketing_consent: storedData.marketing_consent },
        result: validPassed ? 'pass' : 'fail',
        cleanup: stored ? 'pending' : 'not found',
      });
      if (!validPassed) passed = false;

      if (stored) {
        const beforeReload = (await listSubmissions('verified')).filter(item => item?.data?.lead_submission_id === submitted.leadSubmissionId).length;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await sleep(2_000);
        const afterReload = (await listSubmissions('verified')).filter(item => item?.data?.lead_submission_id === submitted.leadSubmissionId).length;
        const duplicatePassed = beforeReload === 1 && afterReload === 1;
        results.push({ form: formName, test: 'confirmation refresh duplicate check', submissionId: stored.id, expected: 1, actual: afterReload, result: duplicatePassed ? 'pass' : 'fail', cleanup: 'pending' });
        if (!duplicatePassed) passed = false;
      }
    }

    const honeypotLeadId = `${runTag}-HONEYPOT-${formName}`;
    const honeypotData = new URLSearchParams({
      'form-name': formName,
      'bot-field': 'synthetic-bot-value',
      ...definition.values,
      processing_consent: 'Yes',
      processing_consent_version: 'processing-consent-v1-2026-07-25',
      marketing_consent: 'No',
      marketing_consent_version: 'marketing-consent-v1-2026-07-25',
      consent: 'Yes',
      consent_recorded_at: new Date().toISOString(),
      lead_submission_id: honeypotLeadId,
      workflow_reference: `TEST-M9-HONEYPOT-${formName}`,
    });
    const honeypotResponse = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: honeypotData,
      redirect: 'manual',
    });
    await sleep(3_000);
    const verifiedHoneypot = await findSubmission(honeypotLeadId, 'verified', 1);
    const spamHoneypot = await findSubmission(honeypotLeadId, 'spam', 4);
    const honeypotPassed = !verifiedHoneypot;
    results.push({ form: formName, test: 'honeypot', submissionId: spamHoneypot?.id || verifiedHoneypot?.id || null, expected: 'not stored as verified', actual: { httpStatus: honeypotResponse.status, verified: Boolean(verifiedHoneypot), spam: Boolean(spamHoneypot) }, result: honeypotPassed ? 'pass' : 'fail', cleanup: spamHoneypot || verifiedHoneypot ? 'pending' : 'discarded by Netlify' });
    if (!honeypotPassed) passed = false;
  }
} finally {
  await browser.close();

  const all = [...await listSubmissions('verified'), ...await listSubmissions('spam')];
  const synthetic = all.filter(containsRunTag);
  for (const submission of synthetic) {
    try {
      await netlifyApi(`/submissions/${submission.id}`, { method: 'DELETE' });
      cleanup.push({ submissionId: submission.id, result: 'deleted' });
    } catch (error) {
      cleanup.push({ submissionId: submission.id, result: 'delete failed', error: String(error?.message || error) });
      passed = false;
    }
  }

  for (const item of results) {
    if (item.submissionId && cleanup.some(entry => entry.submissionId === item.submissionId && entry.result === 'deleted')) item.cleanup = 'deleted';
  }

  await mkdir('test-results/forms', { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ runTag, isolatedSite: baseUrl, passed, results, cleanup }, null, 2)}\n`, 'utf8');
}

if (!passed) throw new Error(`One or more isolated synthetic form tests failed. See ${outputPath}`);
