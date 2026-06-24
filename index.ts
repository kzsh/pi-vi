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

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.setEditorComponent((tui, theme, kb) => {
      const editor = new VimEditor(tui, theme, kb);

      editor.onModeChange = (_mode) => {
        tui.requestRender();
      };

      return editor;
    });
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.setEditorComponent(undefined);
  });
}
