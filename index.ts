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
import { VimEditor } from "./editor.ts";
import type { Mode } from "./editor.ts";

function modeStatus(
  theme: { fg(color: string, text: string): string },
  mode: Mode,
): string {
  switch (mode) {
    case "normal": return theme.fg("accent",  "-- NORMAL --");
    case "insert": return theme.fg("muted",   "-- INSERT --");
    case "ex":     return theme.fg("warning", "-- EX --");
  }
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

      editor.onModeChange = (mode) => {
        ctx.ui.setStatus("vim", modeStatus(ctx.ui.theme, mode));
      };

      editor.onExCommand = (cmd) => {
        if (QUIT_CMDS.has(cmd)) {
          ctx.shutdown();
          return;
        }
        // Forward everything else as a pi slash command.
        // :new → /new, :compact → /compact, :model → /model, etc.
        pi.sendUserMessage(`/${cmd}`, { deliverAs: "followUp" });
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
