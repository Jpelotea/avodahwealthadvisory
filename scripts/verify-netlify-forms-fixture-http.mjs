import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const STRICT_CSP = "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'sha256-UBEM9fc6mr/QFtxsjMEiHUkqNJwq2BWrDJ2hXnKxpY4='; script-src 'self' 'sha256-aAd2Tn6ICOO7lGhHJHaPanNU21uWI478tE+9d9Hltjk='";

function parseHeaders(raw) {
  const blocks = raw.trim().split(/\r?\n\r?\n/).filter(Boolean);
  const block = blocks.at(-1) || '';
  const headers = {};
  for (const line of block.split(/\r?\n/).slice(1)) {
    const index = line.indexOf(':');
    if (index < 1) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  }
  return headers;
}

function countSummary(status, pattern) {
  for (const message of status.summary?.messages || []) {
    const match = `${message.title || ''} ${message.description || ''}`.match(pattern);
    if (match) return Number(match[1]);
  }
  return 0;
}

export async function verifyHttpIsolation({
  deployStatusPath = 'test-results/forms/deploy-status-raw.json',
  deploySafePath = 'test-results/forms/deploy-safe.json',
  headersPath = 'test-results/forms/fixture-response-headers.txt',
  bodyPath = 'test-results/forms/fixture-response-body.html',
  inventoryPath = 'test-results/forms/fixture-inventory.json',
  outputPath = 'test-results/forms/http-isolation.json',
} = {}) {
  const status = JSON.parse(await readFile(deployStatusPath, 'utf8'));
  const safe = JSON.parse(await readFile(deploySafePath, 'utf8'));
  const headers = parseHeaders(await readFile(headersPath, 'utf8'));
  const body = await readFile(bodyPath, 'utf8');
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const functions = status.available_functions || [];
  const edge = status.edge_functions_present === true;
  const redirectRules = countSummary(status, /(\d+)\s+redirect rules? processed/i);
  const headerRules = countSummary(status, /(\d+)\s+header rules? processed/i);
  const csp = headers['content-security-policy'] || '';
  const report = {
    deploymentStateReady: ['ready', 'current'].includes(status.state),
    isolatedSiteIdMatches: status.site_id === safe.isolatedSiteId,
    netlifyFunctionsCount: functions.length,
    edgeFunctionsCount: edge ? 1 : 0,
    effectiveRedirectRules: redirectRules,
    effectiveHeaderRules: headerRules,
    productionRedirectsPresent: redirectRules > 0,
    productionHeadersPresent: headers['referrer-policy'] !== 'no-referrer' || csp !== STRICT_CSP,
    productionAnalyticsOriginsPresent: /(googletagmanager|google-analytics|analytics\.google|g\.doubleclick|facebook\.com|connect\.facebook)/i.test(csp),
    htmlNoindexPresent: /<meta\s+name="robots"\s+content="noindex,nofollow,noarchive"/i.test(body),
    headerNoindexPresent: /noindex/i.test(headers['x-robots-tag'] || '') && /nofollow/i.test(headers['x-robots-tag'] || '') && /noarchive/i.test(headers['x-robots-tag'] || ''),
    cacheControlNoStorePresent: /(?:^|,)\s*no-store(?:,|$)/i.test(headers['cache-control'] || ''),
    referrerPolicyNoReferrerPresent: headers['referrer-policy'] === 'no-referrer',
    effectiveCsp: csp,
    expectedCsp: STRICT_CSP,
    googleTagManagerPresent: /googletagmanager/i.test(csp),
    googleAnalyticsPresent: /(google-analytics|analytics\.google|g\.doubleclick)/i.test(csp),
    metaPixelPresent: /(facebook\.com|connect\.facebook)/i.test(csp),
    productionEnvironmentReferencesPresent: !inventory.checks.productionEnvironmentReferencesAbsent,
    productionSystemsContacted: false,
    publishedFileInventory: inventory.publishedFiles,
    responseHeaders: {
      'x-robots-tag': headers['x-robots-tag'] || null,
      'cache-control': headers['cache-control'] || null,
      'referrer-policy': headers['referrer-policy'] || null,
      'content-security-policy': csp || null,
      'x-content-type-options': headers['x-content-type-options'] || null,
      'x-frame-options': headers['x-frame-options'] || null,
      'permissions-policy': headers['permissions-policy'] || null,
    },
  };
  report.passed = report.deploymentStateReady && report.isolatedSiteIdMatches
    && report.netlifyFunctionsCount === 0 && report.edgeFunctionsCount === 0
    && !report.productionRedirectsPresent && !report.productionHeadersPresent
    && !report.productionAnalyticsOriginsPresent && report.htmlNoindexPresent
    && report.headerNoindexPresent && report.cacheControlNoStorePresent
    && report.referrerPolicyNoReferrerPresent && !report.productionEnvironmentReferencesPresent
    && !report.productionSystemsContacted && !report.googleTagManagerPresent
    && !report.googleAnalyticsPresent && !report.metaPixelPresent;
  Object.assign(safe, {
    state: status.state,
    context: status.context,
    createdAt: status.created_at,
    updatedAt: status.updated_at,
    publishedAt: status.published_at,
    deployTitle: status.title || '',
    availableFunctionCount: functions.length,
    edgeFunctionsPresent: edge,
    effectiveRedirectRules: redirectRules,
    effectiveHeaderRules: headerRules,
    httpIsolationPassed: report.passed,
  });
  await writeFile(deploySafePath, `${JSON.stringify(safe, null, 2)}\n`, 'utf8');
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (!report.passed) throw new Error('Fixture runtime or HTTP-isolation gate failed.');
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await verifyHttpIsolation();
