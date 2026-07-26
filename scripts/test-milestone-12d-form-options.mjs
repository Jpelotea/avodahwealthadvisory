import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = String(process.env.ISOLATED_FORM_URL || '').replace(/\/$/, '');
const siteId = String(process.env.NETLIFY_SITE_ID || '');
const authToken = String(process.env.NETLIFY_AUTH_TOKEN || '');
const outputPath = process.env.M12D_FORM_OPTIONS_REPORT || 'test-results/forms/milestone-12d-form-options.json';
const runTag = `M12D-TEST-${process.env.GITHUB_RUN_ID || Date.now()}`;
const cooldownMs = Number(process.env.M12D_FORM_COOLDOWN_MS || 5_000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!baseUrl || !siteId || !authToken) {
  throw new Error('ISOLATED_FORM_URL, NETLIFY_SITE_ID, and NETLIFY_AUTH_TOKEN are required.');
}

const employmentOptions = ['Employed', 'Unemployed', 'Student', 'Other'];
const educationOptions = [
  'High School Graduate',
  'Senior High School Graduate',
  'Vocational or Technical Graduate',
  'College Undergraduate',
  'College Graduate',
  'Postgraduate',
  'Other',
];

const report = { runTag, createdAt: new Date().toISOString(), tests: [], cleanup: [], passed: true };

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
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) throw new Error(`Netlify API ${options.method || 'GET'} ${apiPath} failed with ${response.status}`);
  return body;
}

async function allSubmissions() {
  const verified = await netlifyApi(`/sites/${siteId}/submissions`) || [];
  const spam = await netlifyApi(`/sites/${siteId}/submissions?state=spam`) || [];
  return [...verified.map((item) => ({ ...item, storageState: 'verified' })), ...spam.map((item) => ({ ...item, storageState: 'spam' }))];
}

async function waitForSubmission(marker, attempts = 18) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const found = (await allSubmissions()).find((item) => JSON.stringify(item.data || {}).includes(marker));
    if (found) return found;
    await sleep(1_500);
  }
  return null;
}

async function removeSubmission(submission, purpose) {
  if (!submission?.id) return;
  await netlifyApi(`/submissions/${submission.id}`, { method: 'DELETE' });
  report.cleanup.push({ submissionId: submission.id, purpose, action: 'deleted', status: 'complete' });
}

function consentFields(marker) {
  return {
    processing_consent: 'Yes',
    processing_consent_version: 'processing-consent-v1-2026-07-25',
    marketing_consent: 'No',
    marketing_consent_version: 'marketing-consent-v1-2026-07-25',
    consent: 'Yes',
    consent_recorded_at: new Date().toISOString(),
    lead_submission_id: `${marker}-LEAD`,
    workflow_reference: marker,
  };
}

async function submitAndVerify({ formName, marker, values, expected, purpose }) {
  const body = new URLSearchParams({ 'form-name': formName, ...values, ...consentFields(marker) });
  const response = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });
  const submission = await waitForSubmission(marker);
  const data = submission?.data || {};
  const mismatches = Object.entries(expected).filter(([key, value]) => String(data[key] ?? '') !== String(value));
  const ok = response.status >= 200 && response.status < 400 && Boolean(submission) && mismatches.length === 0;
  report.tests.push({
    formName,
    purpose,
    marker,
    httpStatus: response.status,
    stored: Boolean(submission),
    storageState: submission?.storageState || null,
    expected,
    mismatches,
    optionalFieldsPresent: ['message', 'interview_availability', 'relevant_experience', 'reason_for_applying'].filter((key) => Object.hasOwn(data, key)),
    result: ok ? 'pass' : 'fail',
  });
  if (!ok) report.passed = false;
  await removeSubmission(submission, purpose);
  await sleep(cooldownMs);
}

const consultationBase = {
  full_name: `${runTag} — NOT A REAL CLIENT`,
  email: `m12d-consultation-${Date.now()}@example.invalid`,
  mobile_number: '09170000000',
  location: 'TEST LOCATION',
  inquiry_type: 'Financial planning',
  preferred_contact_method: 'Online',
  preferred_schedule: 'Synthetic schedule only',
};

await submitAndVerify({
  formName: 'consultation',
  marker: `${runTag}-CONSULTATION-NO-MESSAGE`,
  values: consultationBase,
  expected: { full_name: consultationBase.full_name, processing_consent: 'Yes', marketing_consent: 'No' },
  purpose: 'Consultation without Additional Notes',
});

await submitAndVerify({
  formName: 'consultation',
  marker: `${runTag}-CONSULTATION-WITH-MESSAGE`,
  values: { ...consultationBase, email: `m12d-consultation-message-${Date.now()}@example.invalid`, message: 'Synthetic optional note' },
  expected: { message: 'Synthetic optional note', processing_consent: 'Yes', marketing_consent: 'No' },
  purpose: 'Consultation with Additional Notes',
});

for (const employmentStatus of employmentOptions) {
  const marker = `${runTag}-EMPLOYMENT-${employmentStatus.toUpperCase().replace(/\W+/g, '-')}`;
  const values = {
    full_name: `${marker} — NOT A REAL APPLICANT`,
    email: `m12d-${employmentStatus.toLowerCase()}-${Date.now()}@example.invalid`,
    mobile_number: '09170000000',
    location: 'TEST LOCATION',
    employment_status: employmentStatus,
    educational_background: 'College Graduate',
    career_path: 'Financial advisory path',
  };
  await submitAndVerify({
    formName: 'recruitment-application',
    marker,
    values,
    expected: {
      employment_status: employmentStatus,
      educational_background: 'College Graduate',
      processing_consent: 'Yes',
      marketing_consent: 'No',
    },
    purpose: `Employment status option: ${employmentStatus}; optional recruitment fields omitted`,
  });
}

for (const educationalBackground of educationOptions) {
  const marker = `${runTag}-EDUCATION-${educationalBackground.toUpperCase().replace(/\W+/g, '-').slice(0, 48)}`;
  const values = {
    full_name: `${marker} — NOT A REAL APPLICANT`,
    email: `m12d-education-${Date.now()}-${Math.random().toString(16).slice(2)}@example.invalid`,
    mobile_number: '09170000000',
    location: 'TEST LOCATION',
    employment_status: 'Employed',
    educational_background: educationalBackground,
    career_path: 'Financial advisory path',
  };
  await submitAndVerify({
    formName: 'recruitment-application',
    marker,
    values,
    expected: {
      employment_status: 'Employed',
      educational_background: educationalBackground,
      processing_consent: 'Yes',
      marketing_consent: 'No',
    },
    purpose: `Educational background option: ${educationalBackground}`,
  });
}

report.completedAt = new Date().toISOString();
report.summary = {
  total: report.tests.length,
  passed: report.tests.filter((item) => item.result === 'pass').length,
  failed: report.tests.filter((item) => item.result === 'fail').length,
  deleted: report.cleanup.filter((item) => item.status === 'complete').length,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (!report.passed) throw new Error(`Milestone 12D affected-form option tests failed. See ${outputPath}`);
