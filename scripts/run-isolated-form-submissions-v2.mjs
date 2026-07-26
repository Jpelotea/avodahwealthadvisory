import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const parts = [
  'scripts/test-isolated-form-submissions-v2.part-01.mjs',
  'scripts/test-isolated-form-submissions-v2.part-02.mjs',
  'scripts/test-isolated-form-submissions-v2.part-03.mjs',
  'scripts/test-isolated-form-submissions-v2.part-04.mjs',
];
const output = 'test-results/forms/test-isolated-form-submissions-v2.generated.mjs';
await mkdir(path.dirname(output), { recursive: true });
let source = (await Promise.all(parts.map(part => readFile(part, 'utf8')))).join('');
source = source.replace(
  /  'recruitment-application': \{[\s\S]*?\n  \},\n  'general-inquiry':/,
  `  'recruitment-application': {
    values: marker => ({
      full_name: \`${'${marker}'} — NOT A REAL APPLICANT\`,
      email: syntheticEmail(marker),
      mobile_number: '09170000000',
      location: 'TEST LOCATION',
      employment_status: 'Employed',
      educational_background: 'College Graduate',
      career_path: 'Financial advisory path',
    }),
  },
  'general-inquiry':`,
);
await writeFile(output, source, 'utf8');

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--check', output], { stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', code => resolve(code ?? 1));
});
if (exitCode !== 0) {
  process.exitCode = exitCode;
} else if (!process.argv.includes('--check')) {
  await import(pathToFileURL(path.resolve(output)).href);
}
