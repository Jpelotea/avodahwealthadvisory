async function pollForSyntheticSubmissions({ attempts = 120, delayMs = 5_000 } = {}) {
  const requiredReferences = new Set([
    ...pendingValid.map(item => item.workflowReference),
    ...pendingDoubleClick.filter(item => item.capturedPostRequests > 0).map(item => item.workflowReference),
    ...pendingSameReference.map(item => item.workflowReference),
  ]);
  let verified = [];
  let spam = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    [verified, spam] = await Promise.all([listSubmissions('verified'), listSubmissions('spam')]);
    const references = new Set(
      verified
        .map(item => item?.data?.workflow_reference)
        .filter(reference => typeof reference === 'string' && reference.startsWith(runTag)),
    );
    const allRequiredVisible = [...requiredReferences].every(reference => references.has(reference));
    if (allRequiredVisible) break;
    if (attempt < attempts) await sleep(delayMs);
  }
  return { verified, spam };
}

function matchesReference(submission, reference) {
  return submission?.data?.workflow_reference === reference;
}

function matchesLeadOrReference(submission, leadSubmissionId, workflowReference) {
  return submission?.data?.lead_submission_id === leadSubmissionId || matchesReference(submission, workflowReference);
}

function evaluateStoredResults(verified, spam) {
  for (const pending of pendingValid) {
    const stored = verified.find(item => matchesLeadOrReference(
      item,
      pending.submitted.leadSubmissionId,
      pending.workflowReference,
    ));
    const data = stored?.data || {};
    const timestampValid = !Number.isNaN(Date.parse(data.consent_recorded_at || ''));
    const versionsValid = data.processing_consent_version === 'processing-consent-v1-2026-07-25'
      && data.marketing_consent_version === 'marketing-consent-v1-2026-07-25';
    const campaignValid = pending.formName !== 'consultation'
      || Object.entries(formDefinitions.consultation.campaign).every(([key, value]) => data[key] === value);
    const consentSeparated = data.processing_consent === 'Yes'
      && data.consent === 'Yes'
      && data.marketing_consent === (pending.marketingAccepted ? 'Yes' : 'No');
    const urlSafe = sensitiveUrlKeys(pending.submitted.confirmationUrl).length === 0;
    const ok = pending.canonicalConfirmation
      && Boolean(stored)
      && data.workflow_reference === pending.workflowReference
      && consentSeparated
      && timestampValid
      && versionsValid
      && campaignValid
      && urlSafe;
    recordResult({
      form: pending.formName,
      test: pending.marketingAccepted
        ? 'valid submission — marketing accepted'
        : 'valid submission — marketing declined',
      submissionId: stored?.id || null,
      expected: {
        confirmationPaths: [...confirmationPaths],
        processing_consent: 'Yes',
        consent: 'Yes',
        marketing_consent: pending.marketingAccepted ? 'Yes' : 'No',
        workflowReference: pending.workflowReference,
      },
      actual: {
        confirmationPath: pending.submitted.confirmationPath,
        reachedConfirmation: pending.submitted.reachedConfirmation,
        sensitiveUrlKeys: sensitiveUrlKeys(pending.submitted.confirmationUrl),
        processing_consent: data.processing_consent,
        consent: data.consent,
        marketing_consent: data.marketing_consent,
        processing_consent_version: data.processing_consent_version,
        marketing_consent_version: data.marketing_consent_version,
        consent_recorded_at: data.consent_recorded_at,
        workflow_reference: data.workflow_reference,
        campaignFieldsValid: campaignValid,
      },
      cleanup: stored ? 'pending' : 'not found',
    }, ok);
  }

  for (const pending of pendingDoubleClick) {
    const submissions = verified.filter(item => matchesReference(item, pending.workflowReference));
    const ok = pending.capturedPostRequests <= 1 && submissions.length <= 1;
    recordResult({
      form: pending.formName,
      test: 'double-click submit',
      submissionId: submissions[0]?.id || null,
      expected: 'no accidental duplicate submission',
      actual: {
        capturedPostRequests: pending.capturedPostRequests,
        storedSubmissions: submissions.length,
      },
      cleanup: submissions.length ? 'pending' : 'not created',
    }, ok);
  }

  for (const pending of pendingSameReference) {
    const submissions = verified.filter(item => matchesReference(item, pending.workflowReference));
    recordResult({
      form: pending.formName,
      test: 'same workflow reference resubmission',
      submissionId: submissions[0]?.id || null,
      expected: 'actual Netlify duplicate behavior documented; no idempotency claim',
      actual: {
        submittedAttempts: 2,
        storedSubmissions: submissions.length,
        duplicateRecordsCreated: Math.max(0, submissions.length - 1),
        idempotencyImplemented: submissions.length <= 1,
        distinguishableLeadSubmissionIds: [...new Set(
          submissions.map(item => item?.data?.lead_submission_id).filter(Boolean),
        )].length,
      },
      cleanup: submissions.length ? 'pending' : 'not created',
    }, submissions.length >= 1 && submissions.length <= 2);
  }

  for (const pending of pendingHoneypot) {
    const verifiedMatch = verified.find(item => submissionContains(item, pending.marker));
    const spamMatch = spam.find(item => submissionContains(item, pending.marker));
    const behavior = verifiedMatch
      ? 'stored as verified'
      : spamMatch
        ? 'classified as spam'
        : 'silently discarded or rejected';
    recordResult({
      form: pending.formName,
      test: 'honeypot',
      submissionId: spamMatch?.id || verifiedMatch?.id || null,
      expected: 'not stored as verified',
      actual: {
        httpStatus: pending.httpStatus,
        verified: Boolean(verifiedMatch),
        spam: Boolean(spamMatch),
        behavior,
      },
      cleanup: spamMatch || verifiedMatch ? 'pending' : 'discarded by Netlify',
    }, !verifiedMatch);
  }
}

async function cleanupSyntheticRecords() {
  let synthetic = (await allSubmissions()).filter(item => submissionContains(item, runTag));
  for (const submission of synthetic) {
    const formName = submission.form_name || submission.form?.name || submission.data?.['form-name'] || 'unknown';
    const created = submission.created_at || submission.createdAt || null;
    const testPurpose = submission.data?.workflow_reference || 'synthetic Milestone 11 verification';
    try {
      await netlifyApi(`/submissions/${submission.id}`, { method: 'DELETE' });
      cleanup.push({
        form: formName,
        submissionId: submission.id,
        testPurpose,
        created,
        cleanupAction: 'deleted',
        finalStatus: 'deleted',
      });
    } catch (error) {
      cleanup.push({
        form: formName,
        submissionId: submission.id,
        testPurpose,
        created,
        cleanupAction: 'delete attempted',
        finalStatus: 'delete failed',
        error: String(error?.message || error),
      });
      passed = false;
    }
  }

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const remaining = (await allSubmissions()).filter(item => submissionContains(item, runTag));
    if (remaining.length === 0) return 0;
    if (attempt < 6) await sleep(2_500);
    synthetic = remaining;
  }
  for (const submission of synthetic) {
    cleanup.push({
      form: submission.form_name || submission.form?.name || 'unknown',
      submissionId: submission.id,
      testPurpose: submission.data?.workflow_reference || 'synthetic Milestone 11 verification',
      created: submission.created_at || null,
      cleanupAction: 'post-cleanup verification',
      finalStatus: 'still present',
    });
  }
  passed = false;
  return synthetic.length;
}

