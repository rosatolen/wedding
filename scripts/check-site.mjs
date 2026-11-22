// Site sanity check: Node built-ins only, no network. Exits non-zero on any failure.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (msg) => failures.push(msg);
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const isFile = (rel) => existsSync(join(root, rel)) && statSync(join(root, rel)).isFile();

// (1) pages exist and every local href/src points at something that exists
const pages = ['index.html', 'more-details.html'];
for (const page of pages) {
  if (!isFile(page)) {
    fail(`${page}: file is missing`);
    continue;
  }
  for (const m of read(page).matchAll(/\b(href|src)\s*=\s*"([^"]*)"/gi)) {
    const raw = m[2].trim();
    // external, mailto:, protocol-relative and in-page anchors are not local files
    if (!raw || raw.startsWith('#') || raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const path = decodeURIComponent(raw.split(/[?#]/)[0]);
    if (path === '' || path === '.' || path.endsWith('/')) {
      if (!isFile(join(path, 'index.html'))) fail(`${page}: ${m[1]}="${raw}" has no index.html to land on`);
    } else if (!isFile(path)) {
      fail(`${page}: ${m[1]}="${raw}" points to a missing file`);
    }
  }
}

// (2) every photo figure in index.html has an existing image
if (isFile('index.html')) {
  const figures = [...read('index.html').matchAll(/<figure\b[^>]*class="[^"]*\bphoto\b[^"]*"[^>]*>([\s\S]*?)<\/figure>/gi)];
  if (figures.length === 0) fail('index.html: no photo figures found');
  figures.forEach((f, i) => {
    const src = /<img\b[^>]*\bsrc\s*=\s*"([^"]*)"/i.exec(f[1]);
    if (!src) fail(`index.html: photo figure #${i + 1} has no <img src>`);
    else if (!isFile(src[1])) fail(`index.html: photo figure #${i + 1} image missing: ${src[1]}`);
  });
}

// (3) wedding.ics has the wedding date
if (!isFile('wedding.ics')) fail('wedding.ics: file is missing');
else if (!/^DTSTART[^:\r\n]*:20271023\b/m.test(read('wedding.ics'))) fail('wedding.ics: no DTSTART for 20271023');

// (4) styles.css has balanced braces
if (!isFile('styles.css')) fail('styles.css: file is missing');
else {
  const css = read('styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth++;
    else if (ch === '}' && --depth < 0) break;
  }
  if (depth !== 0) fail(`styles.css: unbalanced braces (depth ${depth})`);
}

if (failures.length) {
  console.error(`check-site: ${failures.length} problem(s)\n` + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log('check-site: all checks passed');
