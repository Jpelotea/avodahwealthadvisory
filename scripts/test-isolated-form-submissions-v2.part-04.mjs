const nativeFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await nativeFetch(...args);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1_500 * attempt);
    }
  }
  throw lastError;
};

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

try {
  const formNames = process.env.SYNTHETIC_FORM_NAME
    ? [process.env.SYNTHETIC_FORM_NAME]
    : Object.keys(formDefinitions);
  for (const [formIndex, formName] of formNames.entries()) {
    if (!formDefinitions[formName]) throw new Error(`Unknown synthetic form name: ${formName}`);
    for (const [operationName, operation] of [
      ['missing required field', () => verifyMissingRequired(context, formName)],
      ['missing processing consent', () => verifyMissingProcessingConsent(context, formName)],
      ['marketing declined and navigation', () => submitValidAndVerifyNavigation(context, formName, false, { exerciseNavigation: true })],
      ['marketing accepted', () => submitValidAndVerifyNavigation(context, formName, true)],
      ['double-click submit', () => verifyDoubleClick(context, formName)],
      ['same workflow reference', () => verifySameReferenceResubmission(context, formName)],
      ['honeypot', () => verifyHoneypot(formName)],
      ['confirmation route', () => verifyConfirmationRoute(formName)],
    ]) {
      try {
        await operation();
      } catch (error) {
        passed = false;
        results.push({
          form: formName,
          test: `unexpected test-harness exception — ${operationName}`,
          submissionId: null,
          expected: 'test completes with structured evidence',
          actual: { error: String(error?.message || error), operationName },
          result: 'fail',
          cleanup: 'pending scan',
        });
      }
      await sleep(1_500);
    }

    const { verified, spam } = await pollForSyntheticSubmissions();
    evaluateStoredResults(verified, spam);
    await cleanupSyntheticRecords();
    pendingValid.length = 0;
    pendingDoubleClick.length = 0;
    pendingSameReference.length = 0;
    pendingHoneypot.length = 0;
    if (formIndex < formNames.length - 1) await sleep(perFormCooldownMs);
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

  try {
    await cleanupSyntheticRecords();
  } catch (error) {
    passed = false;
    cleanup.push({
      form: 'all',
      submissionId: null,
      testPurpose: runTag,
      cleanupAction: 'cleanup scan',
      finalStatus: 'cleanup failed',
      error: String(error?.message || error),
    });
  }

  const deletedIds = new Set(
    cleanup.filter(entry => entry.finalStatus === 'deleted').map(entry => entry.submissionId),
  );
  for (const item of results) {
    if (item.submissionId && deletedIds.has(item.submissionId)) item.cleanup = 'deleted';
  }

  const failed = results.filter(item => item.result === 'fail').length;
  const report = {
    runTag,
    isolatedSite: baseUrl,
    passed: passed && failed === 0 && !fatalError,
    fatalError,
    confirmationPaths: [...confirmationPaths],
    summary: {
      totalTests: results.length,
      passed: results.length - failed,
      failed,
      syntheticRecordsFoundForCleanup: cleanup.filter(item => item.submissionId).length,
      syntheticRecordsDeleted: cleanup.filter(item => item.finalStatus === 'deleted').length,
      cleanupFailures: cleanup.filter(item => item.finalStatus !== 'deleted').length,
    },
    results,
    cleanup,
    browserNetwork: browserNetwork.map(item => ({
      method: item.method,
      url: item.url,
      resourceType: item.resourceType,
      submittedFieldNames: item.submittedFieldNames,
      forbiddenReason: item.forbiddenReason,
    })),
  };
  await mkdir('test-results/forms', { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (!report.passed) process.exitCode = 1;
}
