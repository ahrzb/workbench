// Checks what the browser will enforce or ignore: the CSP hashes must match the inline blocks,
// and nothing that loads from outside may get into the built file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, findProblems } from '../build.mjs';

const hash = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

test('the built page is one file whose CSP hashes match its inline script and style', () => {
  const outDir = mkdtempSync(path.join(tmpdir(), 'wb-html-test-'));
  try {
    const { file } = build({ outDir });
    const html = readFileSync(file, 'utf8');
    const script = html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
    const style = html.match(/<style>([\s\S]*)<\/style>/)[1];
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.ok(csp.includes(`script-src ${hash(script)}`));
    assert.ok(csp.includes(`style-src ${hash(style)}`));
    assert.ok(csp.includes("connect-src 'none'"));
    assert.ok(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval') && !/https?:/.test(csp));
    assert.equal((html.match(/<script/g) ?? []).length, 1);
    assert.equal(path.basename(file), 'My tool.html');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('--try builds a separate, marked copy whose policy still matches; the normal build is unmarked', () => {
  const outDir = mkdtempSync(path.join(tmpdir(), 'wb-html-test-'));
  try {
    const normal = build({ outDir });
    const trial = build({ outDir, tryingOut: true });
    assert.equal(path.basename(trial.file), 'My tool (trying out).html');
    assert.notEqual(trial.file, normal.file);
    assert.ok(trial.js.includes('const TRYING_OUT = true;') && !trial.js.includes('const TRYING_OUT = false;'));
    assert.ok(normal.js.includes('const TRYING_OUT = false;'));
    const html = readFileSync(trial.file, 'utf8');
    const script = html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
    assert.ok(trial.csp.includes(`script-src ${hash(script)}`));
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the build refuses anything that loads from outside or breaks the policy', () => {
  const ok = { html: '<title>x</title>', js: 'const a = 1;', css: 'body { color: red; }' };
  assert.deepEqual(findProblems(ok), []);
  const bad = (patch) => assert.ok(findProblems({ ...ok, ...patch }).length > 0, JSON.stringify(patch));
  bad({ html: '<link rel="stylesheet" href="a.css">' });
  bad({ html: '<button onclick="go()">x</button>' });
  bad({ html: '<p style="color:red">x</p>' });
  bad({ html: '<img src="x.png">' });
  bad({ html: '<script src="https://cdn.example/x.js"></script>' });
  bad({ html: '<style>a{}</style>' });
  bad({ css: '@import "https://fonts.example/a.css";' });
  bad({ css: 'a { background: url(https://x.example/a.png) }' });
  bad({ js: 'fetch("/x")' });
  bad({ js: 'const s = "</script>";' });
  assert.deepEqual(findProblems({ ...ok, css: 'a { background: url(data:image/png;base64,AAAA) }' }), []);
});
