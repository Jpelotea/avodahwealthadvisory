import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APPROVED_ISOLATED_SITE_ID,
  evaluateFormsSecretEnvironment,
} from './forms-secret-preflight.mjs';

const APPROVED_PROJECT_NAME = 'avodah-form-verification-m5';

function classifyResponse(status) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'project-not-found';
  if (status >= 400) return 'unexpected-netlify-error';
  return '';
}

export async function evaluateNetlifyAccess({ environment = process.env, fetchImpl = fetch } = {}) {
  const preflight = evaluateFormsSecretEnvironment(environment);
  const expectedSiteId = environment.EXPECTED_FORM_TEST_SITE_ID || APPROVED_ISOLATED_SITE_ID;
  const safe = {
    status: 'blocked',
    authTokenSecretPresent: preflight.authTokenSecretPresent,
    siteIdSecretPresent: preflight.siteIdSecretPresent,
    siteIdMatchesIsolatedProject: preflight.siteIdMatchesIsolatedProject,
    netlifyAuthenticationSucceeded: false,
    isolatedProjectAccessible: false,
    projectName: APPROVED_PROJECT_NAME,
    expectedSiteId,
    currentDeploymentId: null,
    currentDeploymentState: null,
    projectBuildSettingsPresent: false,
    configuredBuildCommandPresent: false,
    configuredPublishDirectory: null,
    configuredBaseDirectory: null,
    configuredFunctionsDirectory: null,
    buildPluginCount: 0,
    errorClassification: preflight.status === 'ready' ? null : 'protected-preflight-blocked',
  };

  if (preflight.status !== 'ready') return safe;

  const authToken = environment.FORM_TEST_AUTH_TOKEN ?? environment.NETLIFY_AUTH_TOKEN ?? '';
  const siteId = environment.FORM_TEST_SITE_ID ?? environment.NETLIFY_SITE_ID ?? '';

  try {
    const response = await fetchImpl(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}`, {
      headers: { authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) {
      safe.errorClassification = classifyResponse(response.status);
      return safe;
    }

    const project = await response.json();
    const returnedSiteId = project.id || project.site_id || '';
    const siteMatches = returnedSiteId === expectedSiteId;
    const projectMatches = project.name === APPROVED_PROJECT_NAME;
    const buildSettings = project.build_settings && typeof project.build_settings === 'object'
      ? project.build_settings
      : {};
    const plugins = Array.isArray(project.plugins) ? project.plugins : [];
    const currentDeploy = project.published_deploy || project.deploy || {};

    safe.netlifyAuthenticationSucceeded = true;
    safe.isolatedProjectAccessible = siteMatches && projectMatches;
    safe.siteIdMatchesIsolatedProject = safe.siteIdMatchesIsolatedProject && siteMatches;
    safe.projectName = projectMatches ? project.name : APPROVED_PROJECT_NAME;
    safe.currentDeploymentId = currentDeploy.id || project.deploy_id || null;
    safe.currentDeploymentState = currentDeploy.state || project.state || null;
    safe.projectBuildSettingsPresent = Object.keys(buildSettings).length > 0;
    safe.configuredBuildCommandPresent = Boolean(buildSettings.cmd);
    safe.configuredPublishDirectory = buildSettings.dir || null;
    safe.configuredBaseDirectory = buildSettings.base || null;
    safe.configuredFunctionsDirectory = buildSettings.functions_dir || null;
    safe.buildPluginCount = plugins.length;
    safe.errorClassification = safe.isolatedProjectAccessible ? null : 'isolated-project-identity-mismatch';
    safe.status = safe.authTokenSecretPresent
      && safe.siteIdSecretPresent
      && safe.siteIdMatchesIsolatedProject
      && safe.netlifyAuthenticationSucceeded
      && safe.isolatedProjectAccessible
      ? 'ready'
      : 'blocked';
    return safe;
  } catch {
    safe.errorClassification = 'unexpected-authentication-error';
    return safe;
  }
}

export async function writeNetlifyAccessEvidence({
  result,
  outputPath = 'test-results/forms/access-status.json',
  githubOutputPath = process.env.GITHUB_OUTPUT,
} = {}) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  if (githubOutputPath) {
    await appendFile(githubOutputPath, `status=${result.status}\n`, 'utf8');
    await appendFile(githubOutputPath, `netlifyAuthenticationSucceeded=${result.netlifyAuthenticationSucceeded}\n`, 'utf8');
    await appendFile(githubOutputPath, `isolatedProjectAccessible=${result.isolatedProjectAccessible}\n`, 'utf8');
  }
}

async function main() {
  const result = await evaluateNetlifyAccess();
  await writeNetlifyAccessEvidence({ result });
  if (result.status !== 'ready') process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
