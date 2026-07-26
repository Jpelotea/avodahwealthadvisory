import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PHASE_FILE = path.join('.github', 'milestone-12d-phase');
const STYLESHEET = '<link rel="stylesheet" href="/milestone-12d-fixes.css?v=20260726-m12d">';
const REFERENCE_GUIDANCE = 'Please save your reference number. You may use it when following up about this submission.';

const SHARED_FOOTER = `<footer class="avodah-footer global-footer" data-global-footer>
  <div class="footer-container">
    <div class="footer-grid-launch">
      <section><h2>Avodah Wealth Advisory</h2><p>SMART solutions and practical next steps for life’s important decisions.</p><p><a href="tel:+639171867419">+63 917 186 7419</a><br><a href="mailto:avodahwealthadvisory@gmail.com">avodahwealthadvisory@gmail.com</a></p></section>
      <section><h3>Explore</h3><a href="/about/">About Avodah</a><a href="/services/">Services</a><a href="/free-checklists.html">Financial Education</a></section>
      <section><h3>Get Help</h3><a href="/consultation/">Start a Consultation</a><a href="/client-support/">Client Support</a><a href="/contact/">General Inquiry</a></section>
      <section><h3>Careers</h3><a href="/careers/">Join Our Team</a><a href="/careers/opportunities/">Career Opportunities</a><a href="/careers/process/">Application Process</a><a href="/careers/apply/">Apply</a></section>
      <section><h3>Legal</h3><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Use</a><a href="/disclaimer/">Disclaimer</a><a href="/cookies/">Cookie Policy</a><button type="button" class="footer-preference-button" data-cookie-reopen>Cookie Preferences</button></section>
    </div>
    <div class="footer-bottom-row"><div>&copy; 2026 Avodah Wealth Advisory. All rights reserved.</div><div><a href="https://www.facebook.com/avodahwealthadvisory/" target="_blank" rel="noopener">Facebook</a> · <a href="https://m.me/1054966131030483" target="_blank" rel="noopener">Messenger</a></div></div>
  </div>
</footer>`;

const normalizeRootAssets = (html) => html.replace(
  /\b(href|src)=(['"])(?![a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)([^'"]+)\2/gi,
  (_match, attribute, quote, value) => `${attribute}=${quote}/${value}${quote}`,
);

const injectStylesheet = (html) => html.includes('/milestone-12d-fixes.css')
  ? html
  : html.replace(/<\/head>/i, `${STYLESHEET}</head>`);

const applyHomepageChanges = (html) => html
  .replace(
    /(<textarea\b[^>]*\bname=["']message["'][^>]*?)\srequired(?:=["'][^"']*["'])?([^>]*>)/i,
    '$1$2',
  )
  .replace(/Additional Notes \/ Particular Request\s*\*/gi, 'Additional Notes / Particular Request');

const applyRecruitmentChanges = (html) => html
  .replace(
    /<div class="status-panel"><strong>Secure resume submission is not yet enabled\.<\/strong><p>[\s\S]*?<\/p><\/div>/i,
    '<div class="status-panel"><strong>Résumé upload is not required at this stage.</strong><p>Shortlisted applicants will receive further instructions if additional documents are needed.</p></div>',
  )
  .replace(
    /<label>Current occupation<input name="current_occupation" required><span class="field-error"><\/span><\/label>/i,
    '<label>Current Employment Status<select name="employment_status" required><option value="">Select employment status</option><option>Employed</option><option>Unemployed</option><option>Student</option><option>Other</option></select><span class="field-error"></span></label>',
  )
  .replace(
    /<label>Educational background<input name="educational_background" required><span class="field-error"><\/span><\/label>/i,
    '<label>Educational Background<select name="educational_background" required><option value="">Select educational background</option><option>High School Graduate</option><option>Senior High School Graduate</option><option>Vocational or Technical Graduate</option><option>College Undergraduate</option><option>College Graduate</option><option>Postgraduate</option><option>Other</option></select><span class="field-error"></span></label>',
  )
  .replace(
    /<label>Interview availability<input name="interview_availability" required><span class="field-error"><\/span><\/label>/i,
    '<label>Interview availability, optional<input name="interview_availability" aria-describedby="interview-availability-hint"><small class="field-hint" id="interview-availability-hint">Example: Weekdays / 9:00 AM</small><span class="field-error"></span></label>',
  )
  .replace(
    /<label>Relevant experience<textarea name="relevant_experience" maxlength="1500" required><\/textarea><span class="field-error"><\/span><\/label>/i,
    '<label>Relevant experience, optional<textarea name="relevant_experience" maxlength="1500"></textarea><span class="field-error"></span></label>',
  )
  .replace(
    /<label>Reason for applying<textarea name="reason_for_applying" maxlength="1500" required><\/textarea><span class="field-error"><\/span><\/label>/i,
    '<label>Reason for applying, optional<textarea name="reason_for_applying" maxlength="1500"></textarea><span class="field-error"></span></label>',
  );

const applyConfirmationChanges = (html, file) => {
  let output = html.replace(/>Messenger fallback</g, '>Message Us on Messenger<');
  if (output.includes('data-confirmation-reference') && !output.includes(REFERENCE_GUIDANCE)) {
    output = output.replace(
      /(<p><strong>Reference:<\/strong>\s*<span[^>]*data-confirmation-reference[^>]*>[\s\S]*?<\/span><\/p>)/i,
      `$1<p class="reference-guidance">${REFERENCE_GUIDANCE}</p>`,
    );
  }
  if (file === 'contact-confirmation.html') {
    output = output.replace(/<a class="button button-secondary" href="\/contact\.html">Contact Options<\/a>/i, '');
  }
  return output;
};

const applyRecruitmentProcessWording = (html) => html
  .replace(/Review Recruitment Process/g, 'View Application Process')
  .replace(/Review the Process/g, 'View Application Process')
  .replace(/>Review Process</g, '>Application Process<');

const alignConsultationFooter = (html, file) => {
  if (file !== 'needs-check.html') return html;
  if (html.includes('data-global-footer')) return html;
  const existingFooter = /<footer\b[\s\S]*?<\/footer>/i;
  if (existingFooter.test(html)) return html.replace(existingFooter, SHARED_FOOTER);
  return html.replace(/<\/body>/i, `${SHARED_FOOTER}</body>`);
};

export const transformMilestone12DHtml = (html, file) => {
  let output = normalizeRootAssets(html);
  output = injectStylesheet(output);
  if (file === 'index.html') output = applyHomepageChanges(output);
  if (file === 'recruitment-application.html') output = applyRecruitmentChanges(output);
  output = applyConfirmationChanges(output, file);
  output = applyRecruitmentProcessWording(output);
  output = alignConsultationFooter(output, file);
  return output;
};

export async function applyMilestone12D({ root = process.cwd() } = {}) {
  let phase = 'PRE';
  try {
    phase = (await readFile(path.join(root, PHASE_FILE), 'utf8')).trim().toUpperCase();
  } catch {
    phase = 'PRE';
  }
  if (phase !== 'POST') {
    console.log(`Milestone 12D remediation inactive (${phase}).`);
    return { phase, filesChanged: [] };
  }

  const htmlFiles = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name);
  const filesChanged = [];
  for (const file of htmlFiles) {
    const filePath = path.join(root, file);
    const source = await readFile(filePath, 'utf8');
    const transformed = transformMilestone12DHtml(source, file);
    if (transformed !== source) {
      await writeFile(filePath, transformed, 'utf8');
      filesChanged.push(file);
    }
  }
  console.log(`Milestone 12D remediation applied to ${filesChanged.length} HTML file(s).`);
  return { phase, filesChanged };
}
