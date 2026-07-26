async function verifyMissingRequired(context, formName) {
  await withPage(context, async page => {
    const posts = [];
    const listener = request => {
      if (request.method() === 'POST' && new URL(request.url()).host === isolatedHost) posts.push(request.url());
    };
    page.on('request', listener);
    await gotoWithRetry(page, baseUrl);
    const form = page.locator(`form[name="${formName}"]`);
    await form.locator('button[type="submit"],button:not([type])').click();
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('name') || '');
    const control = form.locator(`[name="${focused}"]`);
    const validationMessage = focused ? await control.evaluate(element => element.validationMessage || '') : '';
    const labelText = focused ? await control.evaluate(element => element.labels?.[0]?.textContent?.trim() || '') : '';
    await sleep(500);
    page.off('request', listener);
    const ok = Boolean(focused && validationMessage && labelText)
      && new URL(page.url()).pathname === '/'
      && posts.length === 0;
    recordResult({
      form: formName,
      test: 'missing required field',
      submissionId: null,
      expected: 'blocked, understandable associated error, no POST request',
      actual: { focused, validationMessage, labelText, path: new URL(page.url()).pathname, postRequests: posts.length },
      cleanup: 'not applicable',
    }, ok);
  });
}

async function verifyMissingProcessingConsent(context, formName) {
  await withPage(context, async page => {
    const marker = `${runTag}-${formName}-NO-PROCESSING`;
    const posts = [];
    const listener = request => {
      if (request.method() === 'POST' && new URL(request.url()).host === isolatedHost) posts.push(request.url());
    };
    page.on('request', listener);
    await gotoWithRetry(page, baseUrl);
    const definition = formDefinitions[formName];
    const form = page.locator(`form[name="${formName}"]`);
    const values = definition.values(marker);
    for (const [name, value] of Object.entries(values)) {
      await fillControl(form.locator(`[name="${name}"]`), value);
    }
    await fillControl(form.locator('[name="workflow_reference"]'), marker);
    await form.locator('[data-marketing]').check();
    await form.locator('button[type="submit"],button:not([type])').click();
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('name') || '');
    const retained = await form.locator('[name="email"]').inputValue();
    await sleep(500);
    page.off('request', listener);
    const ok = focused === 'processing_consent' && retained === values.email && posts.length === 0;
    recordResult({
      form: formName,
      test: 'missing processing consent',
      submissionId: null,
      expected: 'blocked; marketing does not satisfy processing consent; values retained; no POST request',
      actual: { focused, retainedEmail: retained, postRequests: posts.length },
      cleanup: 'not applicable',
    }, ok);
  });
}

async function submitValidAndVerifyNavigation(
  context,
  formName,
  marketingAccepted,
  { exerciseNavigation = false } = {},
) {
  await withPage(context, async page => {
    const state = marketingAccepted ? 'MARKETING-ACCEPTED' : 'MARKETING-DECLINED';
    const marker = `${runTag}-${formName}-${state}`;
    const workflowReference = marker;
    const postLeadIds = [];
    const listener = request => {
      if (request.method() !== 'POST' || new URL(request.url()).host !== isolatedHost) return;
      const params = new URLSearchParams(request.postData() || '');
      if (params.get('workflow_reference') === workflowReference) {
        postLeadIds.push(params.get('lead_submission_id') || '');
      }
    };
    page.on('request', listener);
    const { form } = await prepareForm(page, formName, marker, { marketingAccepted, workflowReference });
    const submitted = await submitPrepared(page, form);
    const postsAfterSubmit = postLeadIds.length;
    const confirmationSensitiveKeys = sensitiveUrlKeys(submitted.confirmationUrl);

    if (exerciseNavigation) {
      await page.reload({ waitUntil: 'commit', timeout: 45_000 }).catch(() => null);
      await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
      const refreshPath = new URL(page.url()).pathname;
      const postsAfterRefresh = postLeadIds.length;

      await page.goBack({ waitUntil: 'commit', timeout: 45_000 }).catch(() => null);
      await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
      const backPath = new URL(page.url()).pathname;
      await page.goForward({ waitUntil: 'commit', timeout: 45_000 }).catch(() => null);
      await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
      const forwardPath = new URL(page.url()).pathname;
      const postsAfterNavigation = postLeadIds.length;

      await gotoWithRetry(page, baseUrl);
      const reopenPath = new URL(page.url()).pathname;
      const postsAfterReopen = postLeadIds.length;

      const canonicalConfirmation = submitted.reachedConfirmation && isConfirmationPath(submitted.confirmationPath);
      recordResult({
        form: formName,
        test: 'confirmation refresh',
        submissionId: null,
        expected: 'actual Netlify refresh behavior documented; canonical confirmation and no sensitive URL data',
        actual: {
          confirmationPath: submitted.confirmationPath,
          refreshPath,
          postRequestsBeforeRefresh: postsAfterSubmit,
          postRequestsAfterRefresh: postsAfterRefresh,
          resubmissionObserved: postsAfterRefresh > postsAfterSubmit,
          sensitiveUrlKeys: confirmationSensitiveKeys,
        },
        cleanup: 'pending',
      }, canonicalConfirmation
        && isConfirmationPath(refreshPath)
        && postsAfterSubmit >= 1
        && postsAfterRefresh >= postsAfterSubmit
        && confirmationSensitiveKeys.length === 0);

      recordResult({
        form: formName,
        test: 'Back and Forward navigation',
        submissionId: null,
        expected: 'actual navigation behavior documented without an idempotency claim; no sensitive URL data',
        actual: {
          backPath,
          forwardPath,
          postRequestsBeforeNavigation: postsAfterRefresh,
          postRequestsAfterNavigation: postsAfterNavigation,
          additionalPostRequests: Math.max(0, postsAfterNavigation - postsAfterRefresh),
          sensitiveUrlKeys: confirmationSensitiveKeys,
        },
        cleanup: 'pending',
      }, postsAfterNavigation >= postsAfterRefresh
        && ['/', ...confirmationPaths].includes(backPath)
        && ['/', ...confirmationPaths].includes(forwardPath)
        && confirmationSensitiveKeys.length === 0);

      recordResult({
        form: formName,
        test: 'reopen completed form',
        submissionId: null,
        expected: 'form reopens by explicit GET without an additional POST request',
        actual: {
          path: reopenPath,
          postRequestsBeforeReopen: postsAfterNavigation,
          postRequestsAfterReopen: postsAfterReopen,
        },
        cleanup: 'pending',
      }, reopenPath === '/' && postsAfterReopen === postsAfterNavigation);
    }

    page.off('request', listener);
    const canonicalConfirmation = submitted.reachedConfirmation && isConfirmationPath(submitted.confirmationPath);
    pendingValid.push({
      formName,
      marketingAccepted,
      marker,
      workflowReference,
      submitted,
      canonicalConfirmation,
    });
  });
}

async function verifyDoubleClick(context, formName) {
  await withPage(context, async page => {
    const marker = `${runTag}-${formName}-DOUBLE-CLICK`;
    const workflowReference = marker;
    const captured = [];
    const listener = request => {
      if (request.method() !== 'POST' || new URL(request.url()).host !== isolatedHost) return;
      const params = new URLSearchParams(request.postData() || '');
      if (params.get('workflow_reference') === workflowReference) {
        captured.push(params.get('lead_submission_id') || '');
      }
    };
    page.on('request', listener);
    const { form } = await prepareForm(page, formName, marker, { marketingAccepted: false, workflowReference });
    await form.locator('button[type="submit"],button:not([type])').dblclick({ noWaitAfter: true }).catch(() => {});
    await sleep(5_000);
    page.off('request', listener);
    pendingDoubleClick.push({ formName, marker, workflowReference, capturedPostRequests: captured.length });
  });
}

async function verifySameReferenceResubmission(context, formName) {
  const marker = `${runTag}-${formName}-SAME-REFERENCE`;
  const workflowReference = marker;
  const leadSubmissionIds = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await withPage(context, async page => {
      const prepared = await prepareForm(page, formName, `${marker}-${attempt}`, {
        marketingAccepted: false,
        workflowReference,
      });
      const submitted = await submitPrepared(page, prepared.form);
      leadSubmissionIds.push(submitted.leadSubmissionId);
    });
  }
  pendingSameReference.push({ formName, marker, workflowReference, leadSubmissionIds });
}

async function verifyHoneypot(formName) {
  const marker = `${runTag}-${formName}-HONEYPOT`;
  const definition = formDefinitions[formName];
  const honeypotData = new URLSearchParams({
    'form-name': formName,
    'bot-field': 'synthetic-bot-value',
    ...definition.values(marker),
    ...(definition.campaign || {}),
    processing_consent: 'Yes',
    processing_consent_version: 'processing-consent-v1-2026-07-25',
    marketing_consent: 'No',
    marketing_consent_version: 'marketing-consent-v1-2026-07-25',
    consent: 'Yes',
    consent_recorded_at: new Date().toISOString(),
    lead_submission_id: marker,
    workflow_reference: marker,
  });
  const response = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: honeypotData,
    redirect: 'manual',
  });
  pendingHoneypot.push({ formName, marker, httpStatus: response.status });
}

async function verifyConfirmationRoute(formName) {
  const attempts = [];
  for (const route of confirmationPaths) {
    try {
      const response = await fetch(`${baseUrl}${route}`, { redirect: 'follow' });
      const text = await response.text();
      attempts.push({ route, status: response.status, finalPath: new URL(response.url).pathname, text });
    } catch (error) {
      attempts.push({ route, status: 0, finalPath: '', text: '', error: String(error?.message || error) });
    }
  }
  const accepted = attempts.find(item => item.status === 200 && isConfirmationPath(item.finalPath));
  const text = accepted?.text || '';
  const prohibitedClaims = [
    /appointment (is|has been) confirmed/i,
    /administrator (was|has been) notified/i,
    /within \d+ (minutes|hours|days)/i,
  ];
  const ok = Boolean(accepted)
    && /test submission recorded/i.test(text)
    && /no production integration was invoked/i.test(text)
    && /href=["']\/["']/i.test(text)
    && prohibitedClaims.every(pattern => !pattern.test(text));
  recordResult({
    form: formName,
    test: 'confirmation route direct access and missing-session fallback',
    submissionId: null,
    expected: 'safe canonical isolated success page with no false promises or sensitive URL data',
    actual: {
      acceptedRoute: accepted?.route || null,
      finalPath: accepted?.finalPath || null,
      statuses: attempts.map(item => ({ route: item.route, status: item.status, finalPath: item.finalPath })),
      prohibitedClaimsFound: prohibitedClaims.filter(pattern => pattern.test(text)).map(String),
    },
    cleanup: 'not applicable',
  }, ok);
}

