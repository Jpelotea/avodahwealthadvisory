import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'parse5';

const formsPath = process.env.NETLIFY_FORMS_JSON || 'test-results/forms/netlify-forms.json';
const fixturePath = process.env.FORM_FIXTURE_HTML || 'qa/form-fixture/index.html';
const outputPath = process.env.FORM_SCHEMA_REPORT || 'test-results/forms/schema-report.json';
const requiredFormNames = [
  'consultation',
  'client-needs-check',
  'consultation-recovery',
  'client-support',
  'recruitment-application',
  'general-inquiry',
];

const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const hasAttr = (node, name) => node.attrs?.some(item => item.name === name) || false;

function descendants(node, predicate, output = []) {
  for (const child of node.childNodes || []) {
    if (predicate(child)) output.push(child);
    descendants(child, predicate, output);
  }
  return output;
}

const fixtureHtml = await readFile(fixturePath, 'utf8');
const document = parse(fixtureHtml);
const fixtureForms = descendants(document, node => node.tagName === 'form');
const detectedForms = JSON.parse(await readFile(formsPath, 'utf8'));

const detectedByName = new Map(detectedForms.map(form => [form.name, form]));
const fixtureByName = new Map(fixtureForms.map(form => [attr(form, 'name'), form]));
const report = {
  verifiedAt: new Date().toISOString(),
  source: {
    netlifyFormsApi: formsPath,
    fixture: fixturePath,
  },
  requiredForms: requiredFormNames,
  forms: [],
  missingForms: [],
  unexpectedForms: detectedForms.map(form => form.name).filter(name => !requiredFormNames.includes(name)),
  passed: true,
};

for (const formName of requiredFormNames) {
  const fixture = fixtureByName.get(formName);
  const detected = detectedByName.get(formName);
  if (!fixture || !detected) {
    report.missingForms.push(formName);
    report.passed = false;
    continue;
  }

  const controls = descendants(fixture, node => ['input', 'select', 'textarea'].includes(node.tagName));
  const fixtureFields = controls
    .map(control => ({
      name: attr(control, 'name') || '',
      type: control.tagName === 'input' ? (attr(control, 'type') || 'text') : control.tagName,
      required: hasAttr(control, 'required'),
      value: attr(control, 'value') || '',
    }))
    .filter(field => field.name);

  const expectedDetected = fixtureFields
    .map(field => field.name)
    .filter(name => !['form-name', 'bot-field'].includes(name));
  const actualFields = (detected.fields || []).map(field => ({ name: field.name, type: field.type || 'unknown' }));
  const actualNames = actualFields.map(field => field.name);
  const comparableActual = actualNames.filter(name => !['form-name', 'bot-field'].includes(name));
  const missingFields = expectedDetected.filter(name => !comparableActual.includes(name));
  const unexpectedFields = comparableActual.filter(name => !expectedDetected.includes(name));
  const requiredFields = fixtureFields.filter(field => field.required).map(field => field.name);
  const optionalFields = fixtureFields.filter(field => !field.required && !['form-name', 'bot-field'].includes(field.name)).map(field => field.name);
  const fileUploadFields = fixtureFields.filter(field => field.type === 'file').map(field => field.name);
  const campaignFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'campaign_id', 'adset_id', 'ad_id', 'fbclid'].filter(name => expectedDetected.includes(name));

  const consentChecks = {
    processingConsentDetected: comparableActual.includes('processing_consent'),
    processingConsentVersionDetected: comparableActual.includes('processing_consent_version'),
    marketingConsentDetected: comparableActual.includes('marketing_consent'),
    marketingConsentVersionDetected: comparableActual.includes('marketing_consent_version'),
    consentTimestampDetected: comparableActual.includes('consent_recorded_at'),
    leadSubmissionIdDetected: comparableActual.includes('lead_submission_id'),
    legacyConsentDetected: comparableActual.includes('consent'),
    legacyConsentDefault: fixtureFields.find(field => field.name === 'consent')?.value || '',
    marketingConsentDefault: fixtureFields.find(field => field.name === 'marketing_consent')?.value || '',
  };

  const requiredConsentChecks = Object.entries(consentChecks)
    .filter(([key]) => key.endsWith('Detected'))
    .every(([, value]) => value === true);
  const passed = missingFields.length === 0 && unexpectedFields.length === 0 && requiredConsentChecks;
  if (!passed) report.passed = false;

  report.forms.push({
    formName,
    detectedId: detected.id,
    detectedPaths: detected.paths || [],
    exactDetectedFields: actualFields,
    honeypot: attr(fixture, 'netlify-honeypot') || '',
    requiredFields,
    optionalFields,
    processingConsentField: 'processing_consent',
    processingConsentVersion: fixtureFields.find(field => field.name === 'processing_consent_version')?.value || '',
    marketingConsentField: 'marketing_consent',
    marketingConsentVersion: fixtureFields.find(field => field.name === 'marketing_consent_version')?.value || '',
    consentTimestamp: 'consent_recorded_at',
    workflowReference: fixtureFields.find(field => field.name === 'workflow_reference')?.value || '',
    campaignFields,
    confirmationRoute: attr(fixture, 'action') || '',
    fileUploadFields,
    legacyCompatibilityFields: ['consent'].filter(name => expectedDetected.includes(name)),
    missingFields,
    unexpectedFields,
    consentChecks,
    passed,
  });
}

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (!report.passed) {
  throw new Error(`Isolated Netlify form schemas did not match the committed fixture. See ${outputPath}`);
}
