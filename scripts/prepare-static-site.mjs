import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, serialize } from 'parse5';

const ROOT = process.cwd();
const MEASUREMENT_ID = 'G-HV9X54P7NT';

const attribute = (node, name) => node.attrs?.find((item) => item.name === name)?.value || '';
const textContent = (node) => (node.childNodes || [])
  .filter((child) => child.nodeName === '#text')
  .map((child) => child.value || '')
  .join('');

const removeLegacyAnalytics = (node) => {
  if (!node?.childNodes) return 0;
  let removed = 0;
  node.childNodes = node.childNodes.filter((child) => {
    if (child.tagName !== 'script') return true;
    const src = attribute(child, 'src');
    const inline = textContent(child);
    const legacyLoader = src.includes('googletagmanager.com/gtag/js');
    const legacyConfig = inline.includes(MEASUREMENT_ID) && inline.includes('gtag(');
    if (legacyLoader || legacyConfig) {
      removed += 1;
      return false;
    }
    return true;
  });
  for (const child of node.childNodes) removed += removeLegacyAnalytics(child);
  return removed;
};

const files = (await readdir(ROOT, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name);

let totalRemoved = 0;
for (const file of files) {
  const filePath = path.join(ROOT, file);
  const source = await readFile(filePath, 'utf8');
  if (!source.includes(MEASUREMENT_ID) && !source.includes('googletagmanager.com/gtag/js')) continue;
  const document = parse(source);
  const removed = removeLegacyAnalytics(document);
  if (!removed) continue;
  await writeFile(filePath, serialize(document), 'utf8');
  totalRemoved += removed;
  console.log(`Removed ${removed} legacy analytics script(s) from ${file}.`);
}

const revision = String(process.env.COMMIT_REF || process.env.GITHUB_SHA || 'local');
const deployContext = String(process.env.CONTEXT || 'local');
await writeFile(
  path.join(ROOT, 'rc-revision.json'),
  `${JSON.stringify({ revision, deployContext }, null, 2)}\n`,
  'utf8',
);

console.log(`Static-site preparation complete. Removed ${totalRemoved} legacy analytics script(s).`);
console.log(`Wrote rc-revision.json for ${revision} (${deployContext}).`);
