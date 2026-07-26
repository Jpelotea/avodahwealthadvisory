import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const EXPECTED_FORMS = [
  'consultation',
  'client-needs-check',
  'consultation-recovery',
  'client-support',
  'recruitment-application',
  'general-inquiry',
];

const STYLE_HASH = 'sha256-UBEM9fc6mr/QFtxsjMEiHUkqNJwq2BWrDJ2hXnKxpY4=';
const SCRIPT_HASH = 'sha256-uYPyDyza6RHoxujItx0Xts8lWcO3Ye7XQ+wC5NbblWE=';
const STRICT_CSP = `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' '${STYLE_HASH}'; script-src 'self' '${SCRIPT_HASH}'`;

function hashInline(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return null;
  return `sha256-${createHash('sha256').update(match[1]).digest('base64')}`;
}

export async function inspectFixture({
  configPath = 'tests/netlify-forms-fixture/netlify.toml',
  indexPath = 'qa/form-fixture/index.html',
  confirmationPath = 'qa/form-fixture/confirmation.html',
} = {}) {
  const [config, indexHtml, confirmationHtml] = await Promise.all([
    readFile(configPath, 'utf8'),
    readFile(indexPath, 'utf8'),
    readFile(confirmationPath, 'utf8'),
  ]);
  const detectedForms = [...indexHtml.matchAll(/<form\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
  const duplicateForms = detectedForms.filter((name, index) => detectedForms.indexOf(name) !== index);
  const missingForms = EXPECTED_FORMS.filter(name => !detectedForms.includes(name));
  const unexpectedForms = detectedForms.filter(name => !EXPECTED_FORMS.includes(name));
  const headerValues = Object.fromEntries(
    [...config.matchAll(/^\s*([A-Za-z][A-Za-z0-9-]+)\s*=\s*"([^"]*)"\s*$/gm)].map(match => [match[1], match[2]]),
  );
  const allText = `${config}\n${indexHtml}\n${confirmationHtml}`;
  const urls = allText.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const forbiddenUrls = urls.filter(url => /(googletagmanager|google-analytics|analytics\.google|g\.doubleclick|facebook\.com\/tr|connect\.facebook\.net|script\.google\.com|calendar\.google|meet\.google|avodahwealthadvisory\.netlify\.app|operations[-_.]?hub)/i.test(url));
  const forbiddenEnvironmentReferences = [...new Set((allText.match(/\b(?:GOOGLE_SHEETS_WEBHOOK|APPS_SCRIPT_[A-Z0-9_]*|OPERATIONS_HUB_[A-Z0-9_]*|PRODUCTION_WEBHOOK[A-Z0-9_]*|GA_MEASUREMENT_ID|META_PIXEL_ID|NETLIFY_AUTH_TOKEN)\b/g) || []))];
  const credentialFragments = allText.match(/(?:Bearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9_]{8,})/g) || [];
  const realEmails = (allText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).filter(email => !email.toLowerCase().endsWith('@example.invalid'));
  const styleHash = hashInline(indexHtml, 'style');
  const scriptHash = hashInline(indexHtml, 'script');
  const checks = {
    expectedFormCount: detectedForms.length === EXPECTED_FORMS.length,
    exactForms: missingForms.length === 0 && unexpectedForms.length === 0 && duplicateForms.length === 0,
    publishDirectoryExact: /publish\s*=\s*"dist"/i.test(config),
    noBuildCommand: !/^\s*command\s*=/im.test(config),
    noFunctionsConfig: !/functions\s*=|edge_functions|\[\[plugins\]\]/i.test(config),
    noRedirectConfig: !/\[\[redirects\]\]/i.test(config),
    oneHeaderRule: (config.match(/\[\[headers\]\]/gi) || []).length === 1,
    requiredHeadersExact: headerValues['X-Robots-Tag'] === 'noindex, nofollow, noarchive'
      && headerValues['Cache-Control'] === 'no-store'
      && headerValues['Referrer-Policy'] === 'no-referrer',
    strictCspExact: headerValues['Content-Security-Policy'] === STRICT_CSP,
    inlineHashesMatch: styleHash === STYLE_HASH && scriptHash === SCRIPT_HASH,
    unsafeInlineAbsent: !/unsafe-inline/i.test(config),
    productionUrlsAbsent: forbiddenUrls.length === 0,
    productionEnvironmentReferencesAbsent: forbiddenEnvironmentReferences.length === 0,
    secretsAbsent: credentialFragments.length === 0,
    realPersonalDataAbsent: realEmails.length === 0,
    htmlNoindexPresent: /<meta\s+name="robots"\s+content="noindex,nofollow,noarchive"/i.test(indexHtml),
    confirmationNoindexPresent: /<meta\s+name="robots"\s+content="noindex,nofollow,noarchive"/i.test(confirmationHtml),
    syntheticNoticePresent: /TEST ENVIRONMENT — SYNTHETIC DATA ONLY/.test(indexHtml),
  };
  return {
    configPath,
    sourceFiles: [indexPath, confirmationPath],
    publishedFiles: ['index.html', 'confirmation.html'],
    expectedForms: EXPECTED_FORMS,
    detectedForms,
    missingForms,
    unexpectedForms,
    duplicateForms,
    styleHash,
    scriptHash,
    effectiveFixtureCsp: headerValues['Content-Security-Policy'] || null,
    forbiddenUrls,
    forbiddenEnvironmentReferences,
    credentialFragmentsFound: credentialFragments.length,
    realEmailsFound: realEmails,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}

async function main() {
  const outputPath = process.env.FORM_FIXTURE_INVENTORY || 'test-results/forms/fixture-inventory.json';
  const report = await inspectFixture();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
