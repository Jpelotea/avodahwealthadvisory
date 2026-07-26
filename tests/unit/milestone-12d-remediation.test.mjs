import assert from 'node:assert/strict';
import test from 'node:test';
import { transformMilestone12DHtml } from '../../scripts/apply-milestone-12d-remediation.mjs';

test('homepage consultation message becomes optional', () => {
  const source = '<html><head></head><body><form name="consultation"><label>Additional Notes / Particular Request<textarea name="message" required></textarea></label></form></body></html>';
  const output = transformMilestone12DHtml(source, 'index.html');
  assert.match(output, /name="message"/);
  assert.doesNotMatch(output, /name="message" required/);
  assert.match(output, /milestone-12d-fixes\.css/);
});

test('recruitment fields use approved native selects and optional fields', () => {
  const source = '<html><head></head><body><div class="status-panel"><strong>Secure resume submission is not yet enabled.</strong><p>Old notice</p></div><label>Current occupation<input name="current_occupation" required><span class="field-error"></span></label><label>Educational background<input name="educational_background" required><span class="field-error"></span></label><label>Interview availability<input name="interview_availability" required><span class="field-error"></span></label><label>Relevant experience<textarea name="relevant_experience" maxlength="1500" required></textarea><span class="field-error"></span></label><label>Reason for applying<textarea name="reason_for_applying" maxlength="1500" required></textarea><span class="field-error"></span></label></body></html>';
  const output = transformMilestone12DHtml(source, 'recruitment-application.html');
  assert.match(output, /select name="employment_status" required/);
  assert.match(output, /Select employment status/);
  assert.match(output, /select name="educational_background" required/);
  assert.match(output, /College Graduate/);
  assert.doesNotMatch(output, /name="interview_availability" required/);
  assert.doesNotMatch(output, /name="relevant_experience"[^>]*required/);
  assert.doesNotMatch(output, /name="reason_for_applying"[^>]*required/);
  assert.match(output, /Résumé upload is not required at this stage/);
});

test('confirmation copy and reference guidance are applied safely', () => {
  const source = '<html><head></head><body><p><strong>Reference:</strong> <span data-confirmation-reference>ABC</span></p><a class="button button-secondary" href="https://m.me/example">Messenger fallback</a><a class="button button-secondary" href="/contact.html">Contact Options</a></body></html>';
  const output = transformMilestone12DHtml(source, 'contact-confirmation.html');
  assert.match(output, /Message Us on Messenger/);
  assert.match(output, /Please save your reference number/);
  assert.doesNotMatch(output, />Contact Options</);
});
