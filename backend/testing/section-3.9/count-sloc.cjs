const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const tracked = execFileSync("git", ["ls-files", "-z", "--", "src", "backend"], { cwd: root, encoding: "utf8" }).split("\0");
const runtime = /^backend\/(?:server\.js$|(?:config|lib|middleware|models|routes)\/.*\.js$)/;
const frontend = /^src\/.*\.(?:ts|tsx)$/;

function codeLines(file) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, "TypeScript parser diagnostics for " + file);
  const lines = new Set();

  function visit(node) {
    if (ts.isJSDoc(node)) return;
    const children = node.getChildren(source);
    if (children.length) {
      for (const child of children) visit(child);
      return;
    }
    const start = node.getStart(source);
    if (start >= node.end) return;
    const first = source.getLineAndCharacterOfPosition(start).line;
    const last = source.getLineAndCharacterOfPosition(node.end - 1).line;
    const lineStarts = source.getLineStarts();
    for (let line = first; line <= last; line += 1) {
      const from = Math.max(start, lineStarts[line]);
      const to = Math.min(node.end, lineStarts[line + 1] ?? text.length);
      if (text.slice(from, to).trim()) lines.add(line);
    }
  }

  visit(source);
  return lines.size;
}

const rows = tracked
  .filter(file => runtime.test(file) || frontend.test(file))
  .map(file => ({ file, scope: runtime.test(file) ? "backend-runtime" : "frontend-ts-tsx", lines: codeLines(file) }));
const summary = {
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  typescriptVersion: ts.version,
  backendRuntimeSLOC: rows.filter(row => row.scope === "backend-runtime").reduce((sum, row) => sum + row.lines, 0),
  frontendSLOC: rows.filter(row => row.scope === "frontend-ts-tsx").reduce((sum, row) => sum + row.lines, 0),
  files: rows,
};
console.log(JSON.stringify(summary, null, 2));
