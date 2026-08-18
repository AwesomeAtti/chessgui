/**
 * CI guardrail for B-072 and ADR-0001.
 *
 * Two rules, both cheap to keep and expensive to restore once broken:
 *
 * 1. **No user-facing string literals in components.** Every word the user reads comes
 *    from the message catalogue.
 * 2. **No direct `@tauri-apps/api` imports outside `src/shell/`.** This is what keeps
 *    ADR-0001 reversible — the standing constraint in the handover.
 *
 * Uses the TypeScript compiler's own parser rather than regexes. That was not the first
 * attempt: a regex scan flagged `=>` and `<` as JSX delimiters and produced three false
 * positives immediately. Since `typescript` is already a devDependency, real parsing costs
 * nothing and does not cry wolf — and a guardrail that cries wolf gets switched off.
 *
 * This is the fast check. B-072's pseudo-locale build is the thorough one, and catches
 * the case this cannot: a string that *is* in the catalogue but clips its layout.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

/** Attributes whose values are read by a user, or by a screen reader on their behalf. */
const USER_FACING_ATTRS = new Set([
  "title",
  "placeholder",
  "alt",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-valuetext",
]);

/** Two consecutive letters — enough to distinguish words from punctuation and glyphs. */
const LOOKS_LIKE_PROSE = /\p{L}{2}/u;

const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.tsx?$/.test(full)) check(full);
  }
}

function check(file) {
  const rel = relative(ROOT, file);
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const inShell = rel.startsWith(`src${sep}shell${sep}`);

  const at = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const report = (node, message) => violations.push(`${rel}:${at(node)}: ${message}`);

  const visit = (node) => {
    // Rule 2 — the IPC boundary.
    //
    // **Widened twice at B-007 milestone 4, and both holes were found by using it rather than
    // by reading it.** It previously matched `@tauri-apps/api` only, as a *static* import.
    //
    // - Plugins are a different specifier. `@tauri-apps/plugin-dialog` is every bit as much a
    //   Tauri API as `@tauri-apps/api/core`, and the first plugin arriving is exactly when a
    //   rule naming only one of them silently stops holding.
    // - `import()` is a call expression, not an import declaration, so dynamic imports were
    //   never checked at all. That is not hypothetical: `src/shell/ipc.ts` has used a dynamic
    //   import since milestone 3, precisely so the Tauri API stays out of a browser bundle. A
    //   component copying that pattern would have passed this check.
    //
    // Matching the whole `@tauri-apps/` namespace rather than a list of packages, so the next
    // plugin needs no change here. Only `src/` is scanned, so build-time packages are unaffected.
    const tauriSpecifier = (spec) => spec.startsWith("@tauri-apps/");
    const reportBoundary = (spec) =>
      report(
        node,
        `imports "${spec}" outside src/shell/ — route it through src/shell/ (ADR-0001)`,
      );

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (!inShell && tauriSpecifier(spec)) reportBoundary(spec);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      const spec = node.arguments[0].text;
      if (!inShell && tauriSpecifier(spec)) reportBoundary(spec);
    }

    // Rule 1a — text typed directly into JSX.
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (LOOKS_LIKE_PROSE.test(text)) {
        report(node, `literal text in JSX: ${JSON.stringify(text.slice(0, 60))} — use t("…")`);
      }
    }

    // Rule 1b — a bare string inside a JSX expression container: {"Save"}
    if (
      ts.isJsxExpression(node) &&
      node.expression !== undefined &&
      ts.isStringLiteralLike(node.expression) &&
      LOOKS_LIKE_PROSE.test(node.expression.text)
    ) {
      report(node, `literal string in JSX: ${JSON.stringify(node.expression.text)} — use t("…")`);
    }

    // Rule 1c — user-facing attributes given a literal.
    if (ts.isJsxAttribute(node) && node.initializer !== undefined) {
      const name = node.name.getText(sf);
      if (USER_FACING_ATTRS.has(name)) {
        const init = node.initializer;
        const literal = ts.isStringLiteral(init)
          ? init
          : ts.isJsxExpression(init) &&
              init.expression !== undefined &&
              ts.isStringLiteralLike(init.expression)
            ? init.expression
            : null;
        if (literal !== null && LOOKS_LIKE_PROSE.test(literal.text)) {
          report(node, `literal ${name}=${JSON.stringify(literal.text)} — use t("…")`);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
}

walk(SRC);

if (violations.length > 0) {
  console.error(`\n✗ ${violations.length} i18n/boundary violation(s):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error("");
  process.exit(1);
}

console.log("✓ no user-facing literals; IPC boundary intact");
