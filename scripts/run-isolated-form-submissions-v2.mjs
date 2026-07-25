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
const source = (await Promise.all(parts.map(part => readFile(part, 'utf8')))).join('');
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
