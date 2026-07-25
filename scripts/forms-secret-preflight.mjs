import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPROVED_ISOLATED_SITE_ID = 'e07260a5-6308-4f68-a41d-d26f267df9ab';

export function evaluateFormsSecretPreflight({
  authTokenSecretPresent = false,
  siteIdSecretPresent = false,
  siteIdMatchesIsolatedProject = false,
  expectedSiteId = APPROVED_ISOLATED_SITE_ID,
  validationError = false,
} = {}) {
  const authPresent = authTokenSecretPresent === true;
  const sitePresent = siteIdSecretPresent === true;
  const siteMatches = siteIdMatchesIsolatedProject === true;
  const ready = validationError !== true && authPresent && sitePresent && siteMatches;

  return {
    status: ready ? 'ready' : 'blocked',
    authTokenSecretPresent: authPresent,
    siteIdSecretPresent: sitePresent,
    siteIdMatchesIsolatedProject: siteMatches,
    expectedSiteId,
  };
}

export function evaluateFormsSecretEnvironment(environment = process.env) {
  const expectedSiteId =
    environment.EXPECTED_FORM_TEST_SITE_ID ||
    environment.EXPECTED_NETLIFY_SITE_ID ||
    APPROVED_ISOLATED_SITE_ID;

  try {
    const authToken = environment.FORM_TEST_AUTH_TOKEN ?? environment.NETLIFY_AUTH_TOKEN ?? '';
    const siteId = environment.FORM_TEST_SITE_ID ?? environment.NETLIFY_SITE_ID ?? '';
    const authTokenSecretPresent = typeof authToken === 'string' && authToken.length > 0;
    const siteIdSecretPresent = typeof siteId === 'string' && siteId.length > 0;
    const siteIdMatchesIsolatedProject = siteIdSecretPresent && siteId === expectedSiteId;

    return evaluateFormsSecretPreflight({
      authTokenSecretPresent,
      siteIdSecretPresent,
      siteIdMatchesIsolatedProject,
      expectedSiteId,
    });
  } catch {
    return evaluateFormsSecretPreflight({ expectedSiteId, validationError: true });
  }
}

export async function writeFormsSecretPreflightEvidence({
  result,
  outputPath = 'test-results/forms/secrets-status.json',
  githubOutputPath = process.env.GITHUB_OUTPUT,
  githubStepSummaryPath = process.env.GITHUB_STEP_SUMMARY,
} = {}) {
  const safeResult = result ?? evaluateFormsSecretPreflight({ validationError: true });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(safeResult)}\n`, 'utf8');

  if (githubOutputPath) {
    await appendFile(githubOutputPath, `status=${safeResult.status}\n`, 'utf8');
  }

  if (githubStepSummaryPath) {
    const summary =
      safeResult.status === 'ready'
        ? 'Isolated Forms protected-secret preflight is ready for the approved test site.\n'
        : 'Isolated Forms protected-secret preflight is blocked.\n';
    await appendFile(githubStepSummaryPath, summary, 'utf8');
  }

  return safeResult;
}

async function main() {
  let result;
  try {
    result = evaluateFormsSecretEnvironment(process.env);
  } catch {
    result = evaluateFormsSecretPreflight({ validationError: true });
  }

  try {
    await writeFormsSecretPreflightEvidence({ result });
  } catch {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
