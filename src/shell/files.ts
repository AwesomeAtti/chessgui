/**
 * Native file selection and drag-and-drop.
 *
 * **Part of the `src/shell/` boundary** (ADR-0001): these are the two platform surfaces
 * B-069 lists as open, and both are Tauri APIs. Nothing above this directory may import
 * `@tauri-apps/*` — `scripts/check-no-literals.mjs` enforces it, and was widened at this
 * milestone to cover `@tauri-apps/plugin-*` as well as `@tauri-apps/api`, because the first
 * plugin arriving is exactly when a boundary that only names one of them stops working.
 *
 * Both functions degrade to nothing outside Tauri, so `npm run dev` still runs in a plain
 * browser. That is not only convenience: a browser control is what caught B-048's false
 * negative (B-077).
 *
 * # Why paths and not `File` objects
 *
 * A webview `<input type="file">` would hand back `File` objects the frontend could read
 * itself, and would need no plugin at all. It is not used, because **Tauri's drag-and-drop
 * event delivers paths, not files** — so the drop path has to go through Rust regardless, and
 * having the picker take the same route means one command, one decoder and one place where the
 * Latin-1 fallback happens. The alternative is two import paths that can disagree.
 */

/** True when running inside a Tauri webview rather than a plain browser. */
function inShell(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * The extensions offered by the picker.
 *
 * A filter, never a check: the user can always choose "All files", and what a PGN file
 * actually is remains `pgn-reader`'s opinion rather than ours (ADR-0009 rule 3). Nothing
 * downstream rejects a file for its name, and a `.txt` full of games imports fine.
 */
const PGN_EXTENSIONS = ["pgn"];

/**
 * Ask the user for PGN files. Returns an empty array if they cancel.
 *
 * Multi-select, because Scid vs. PC — the one surveyed product that documents this — allows
 * "several PGN files [...] selected in this dialogue at once", and because the measurement at
 * B-033 found no performance reason to take them one at a time.
 */
export async function choosePgnFiles(): Promise<readonly string[]> {
  if (!inShell()) return [];
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const chosen = await open({
      multiple: true,
      directory: false,
      filters: [{ name: "PGN", extensions: [...PGN_EXTENSIONS] }],
    });
    if (chosen === null) return [];
    return Array.isArray(chosen) ? chosen : [chosen];
  } catch (cause) {
    // A cancelled dialog resolves to null rather than throwing, so reaching here means the
    // plugin or its permission is missing. Nothing the user can act on; the caller sees no
    // files and the app is unchanged.
    console.error("[shell] file dialog failed", cause);
    return [];
  }
}

/**
 * Subscribe to files being dropped on the window. Returns an unsubscribe function.
 *
 * **The event is window-wide and cannot be scoped to an element**, which is why the decision
 * about *where* a drop is meaningful lives in the React tree rather than here. This module
 * reports the gesture; the app decides what it means.
 *
 * Only the drop itself is forwarded. Tauri also emits enter/over/leave, and a hover affordance
 * is worth having — but it is a separate concern from importing, and the confirmation dialog
 * is what actually tells the user we understood the drop.
 */
export function onPgnFileDrop(
  handler: (paths: readonly string[]) => void,
): () => void {
  if (!inShell()) return () => {};

  let disposed = false;
  let unlisten: (() => void) | null = null;

  void (async () => {
    try {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      const stop = await getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type !== "drop") return;
        const paths = event.payload.paths;
        if (paths.length > 0) handler(paths);
      });
      // The subscription can outlive the component if unmount raced the await.
      if (disposed) stop();
      else unlisten = stop;
    } catch (cause) {
      console.error("[shell] drag-drop subscription failed", cause);
    }
  })();

  return () => {
    disposed = true;
    unlisten?.();
  };
}
