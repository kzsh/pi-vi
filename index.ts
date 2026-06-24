/**
 * pi-vi — vim motions and modes for the pi agent input editor.
 *
 * Install globally:
 *   ln -s $(pwd) ~/.pi/agent/extensions/pi-vi
 *
 * Or test in one session:
 *   pi -e ./index.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Theme } from "@earendil-works/pi-coding-agent";
import { VimEditor } from "./editor.ts";
import type { Mode } from "./editor.ts";

function modeStatus(theme: Theme, mode: Mode): string {
  if (mode === "normal") return theme.fg("accent", " NORMAL ");
  if (mode === "ex") return theme.fg("warning", " : ");
  return theme.fg("dim", " INSERT ");
}

// Quit-like ex commands that map to ctx.shutdown().
const QUIT_CMDS = new Set(["q", "quit", "wq", "x", "xa", "q!"]);

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    // Set initial footer status before the editor factory fires.
    ctx.ui.setStatus("vim", modeStatus(ctx.ui.theme, "insert"));

    ctx.ui.setEditorComponent((tui, theme, kb) => {
      const editor = new VimEditor(tui, theme, kb);

      editor.onExCommand = (cmd) => {
        if (QUIT_CMDS.has(cmd)) {
          ctx.shutdown();
          return;
        }
        // Forward everything else as a pi slash command.
        // :new → /new, :compact → /compact, :model → /model, etc.
        pi.sendUserMessage(`/${cmd}`, { deliverAs: "followUp" });
      };

      editor.onModeChange = (mode) => {
        ctx.ui.setStatus("vim", modeStatus(ctx.ui.theme, mode));
      };

      return editor;
    });
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.setStatus("vim", undefined);
    ctx.ui.setEditorComponent(undefined);
  });
}
