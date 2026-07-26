import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = String(process.env.ISOLATED_FORM_URL || '').replace(/\/$/, '');
const outputPath = process.env.M12E_REQUIRED_FIELDS_REPORT || 'test-results/forms/milestone-12e-required-fields.json';

if (!baseUrl) throw new Error('ISOLATED_FORM_URL is required.');

const requiredCases = [
  { field: 'full_name', label: 'Full name' },
  { field: 'email', label: 'Email' },
  { field: 'mobile_number', label: 'Mobile number' },
  { field: 'location', label: 'Location' },
  { field: 'career_path', label: 'Role / career path' },
  { field: 'employment_status', label: 'Current Employment Status' },
  { field: 'educational_background', label: 'Educational Background' },
  { field: 'processing_consent', label: 'Processing consent' },
];

async function populateRequired(form) {
  await form.locator('[name="full_name"]').fill('TEST M12E REQUIRED FIELD — NOT A REAL APPLICANT');
  await form.locator('[name="email"]').fill('m12e-required-fields@example.invalid');
  await form.locator('[name="mobile_number"]').fill('09170000000');
  await form.locator('[name="location"]').fill('TEST LOCATION');
  await form.locator('[name="employment_status"]').selectOption({ label: 'Employed' });
  await form.locator('[name="educational_background"]').selectOption({ label: 'College Graduate' });
  await form.locator('[name="career_path"]').selectOption({ label: 'Financial advisory path' });
  await form.locator('[name="processing_consent"]').check();
}

async function omitField(form, field) {
  const control = form.locator(`[name="${field}"]`);
  const type = await control.getAttribute('type');
  const tag = await control.evaluate((element) => element.tagName.toLowerCase());
  if (type === 'checkbox') await control.uncheck();
  else if (tag === 'select') await control.selectOption('');
  else await control.fill('');
}

const browser = await chromium.launch({ headless: true });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  formName: 'recruitment-application',
  tests: [],
  passed: true,
};

try {
  for (const testCase of requiredCases) {
    const page = await browser.newPage();
    let postRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().startsWith(baseUrl)) postRequests += 1;
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    const form = page.locator('form[name="recruitment-application"]');
    await populateRequired(form);
    await omitField(form, testCase.field);
    await form.locator('button').click();
    await page.waitForTimeout(300);
    const control = form.locator(`[name="${testCase.field}"]`);
    const actual = await control.evaluate((element) => ({
      name: element.getAttribute('name'),
      required: element.required === true,
      validationMessage: element.validationMessage,
      focused: document.activeElement === element,
      value: element.type === 'checkbox' ? element.checked : element.value,
    }));
    const passed = actual.required && actual.focused && Boolean(actual.validationMessage) && postRequests === 0;
    report.tests.push({
      field: testCase.field,
      label: testCase.label,
      expected: 'Browser validation blocks submission, focuses the omitted required control, and sends no POST request.',
      actual: { ...actual, postRequests },
      result: passed ? 'pass' : 'fail',
    });
    if (!passed) report.passed = false;
    await page.close();
  }
} finally {
  await browser.close();
}

report.summary = {
  total: report.tests.length,
  passed: report.tests.filter((item) => item.result === 'pass').length,
  failed: report.tests.filter((item) => item.result === 'fail').length,
  postRequests: report.tests.reduce((sum, item) => sum + item.actual.postRequests, 0),
  recordsCreated: 0,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (!report.passed) throw new Error(`Milestone 12E required-field checks failed. See ${outputPath}`);
