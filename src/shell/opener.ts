/**
 * Opening an external URL in the user's own browser (B-117).
 *
 * **Part of the `src/shell/` boundary** (ADR-0001), for the reason B-117 was raised: in a
 * webview a bare `<a href>` navigates the *app window* away from the app, and there is no back
 * button to return with. That is a worse failure than showing the URL as plain text, which is
 * what the info panel did until now.
 *
 * **Do not "just add `target="_blank"`."** That is the version that looks like it works and
 * does not — the note exists here as well as in the backlog so the next person meets it at the
 * code rather than after the running app surprises them.
 *
 * # The capability needs *two* entries, and one is not a weaker version of the other
 *
 * `capabilities/default.json` must list **both**:
 *
 * - `opener:allow-open-url` — grants the **command**, and carries no scope at all.
 * - `opener:allow-default-urls` — grants the **scope** (`mailto:`, `tel:`, `http://*`,
 *   `https://*`), and its `commands.allow` is empty.
 *
 * Either one alone builds green and does **nothing whatsoever** when clicked. That is not a
 * guess: it is read from `src-tauri/gen/schemas/acl-manifests.json`, which `tauri-build`
 * generates from the plugins' own manifests — the authoritative, local answer to what a
 * permission actually grants, and the thing to consult before editing this file again.
 * (The plugin's own `opener:default` set is these two plus `allow-reveal-item-in-dir`, which
 * opens Finder on a path and is not something this app should be able to do.)
 *
 * **The lesson is the shape of the failure, and it cost two wrong fixes to learn.** Tauri
 * validates permission *identifiers* at build time, so a misspelling is a build error. It does
 * not check that the set you listed is *coherent*, so a command without a scope, or a scope
 * without a command, is a feature that silently does nothing with everything green. Neither a
 * passing test suite nor a screenshot can see it — only clicking can. When something
 * capability-gated is inert, read the ACL manifest rather than guessing at the entry, and
 * check the webview console: the `catch` below logs the rejection.
 */

function inShell(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Hand a URL to the operating system. Returns false if it could not be opened.
 *
 * **Only `http:` and `https:` are passed on.** The opener hands the string to the platform,
 * which will happily act on `file:` or a custom scheme — so this is the one place a URL that
 * came out of a PGN tag, written by whoever produced the file, gets checked before the OS sees
 * it. It is the single case in this project where we do validate input, and the reason it does
 * not contradict ADR-0009 is that the subject is not a chess game: a `Link` tag is arbitrary
 * text from an untrusted file, and handing arbitrary text to the shell is a different question
 * from deciding what a legal move is.
 */
export async function openExternal(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  if (!inShell()) {
    // In a plain browser there is no app window to lose, so the ordinary thing is correct.
    window.open(parsed.href, "_blank", "noopener,noreferrer");
    return true;
  }

  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(parsed.href);
    return true;
  } catch (cause) {
    console.error("[shell] opener failed", cause);
    return false;
  }
}
