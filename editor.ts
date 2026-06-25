/**
 * VimEditor — wraps pi's CustomEditor with vim modal editing.
 *
 * Architecture:
 *
 *   keypress
 *      │
 *      ▼
 *   handleInput()
 *      │
 *      ├─ insert mode → super.handleInput(data)  [pass-through]
 *      │
 *      └─ normal mode state machine
 *              │
 *              ├─ digit            → accumulate countBuffer
 *              ├─ pendingR + char  → replace n chars
 *              ├─ pendingG + char  → complete g-command (gg)
 *              ├─ pendingOp + char → apply operator + motion
 *              └─ standalone key   → motion / command
 *
 * All editing is done by emitting escape sequences to super.handleInput().
 * We never read the buffer, so yank is simulated via the kill ring:
 *   kill text → immediately paste back → text stays, kill ring has it → p works.
 */

import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { matchesKey, sliceByColumn, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export type Mode = "normal" | "insert";

type PendingOp = "d" | "c" | "y";

// Escape sequences understood by the underlying editor.
const S = {
  left:           "\x1b[D",  // ← arrow
  right:          "\x1b[C",  // → arrow
  up:             "\x1b[A",  // ↑ arrow
  down:           "\x1b[B",  // ↓ arrow
  lineStart:      "\x01",    // Ctrl+A
  lineEnd:        "\x05",    // Ctrl+E
  delForward:     "\x1b[3~", // Delete key
  delBackward:    "\x7f",    // Backspace
  delWordForward: "\x1bd",   // Alt+D  (tui.editor.deleteWordForward)
  delWordBackward:"\x17",    // Ctrl+W (tui.editor.deleteWordBackward)
  delToLineEnd:   "\x0b",    // Ctrl+K (tui.editor.deleteToLineEnd)
  delToLineStart: "\x15",    // Ctrl+U (tui.editor.deleteToLineStart)
  // Alt+F lands *past* the word end (cursor sits on the trailing space).
  // Combine with ← or → to get vim-accurate e (last char) and w (next word start).
  wordEndRaw:     "\x1bf",   // Alt+F — moves past word, cursor on trailing space
  wordBackward:   "\x1bb",   // Alt+B  (tui.editor.cursorWordLeft)
  undo:           "\x1f",    // Ctrl+- (tui.editor.undo)
  paste:          "\x19",    // Ctrl+Y (tui.editor.yank — paste from kill ring)
} as const;

// How many lines to scan when jumping to buffer start/end.
// Pi prompts won't have 500 lines; this is a safe upper bound.
const MAX_LINES = 500;

// Lines moved per Ctrl+D / Ctrl+U scroll step (vim half-page equivalent).
const SCROLL_LINES = 10;

export class VimEditor extends CustomEditor {
  private mode: Mode = "insert";
  private countBuffer = "";
  private pendingOp: PendingOp | null = null;
  private pendingG = false;
  private pendingR = false;
  // Index of the bottom border line in the last super.render() output.
  // Captured every render cycle where autocomplete is not showing so that
  // when autocomplete IS showing (and appends suggestion lines after the
  // border) we still know exactly where the border sits.
  private _lastBorderIndex = 0;

  /** Called whenever the mode changes. Wire this up in the extension. */
  onModeChange?: (mode: Mode) => void;

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.onModeChange?.(mode);
  }

  private get count(): number {
    const n = parseInt(this.countBuffer, 10);
    return isNaN(n) || n < 1 ? 1 : n;
  }

  /** Emit a terminal escape sequence to the underlying editor, optionally repeated. */
  private send(seq: string, times = 1): void {
    for (let i = 0; i < times; i++) super.handleInput(seq);
  }

  private clearState(): void {
    this.pendingOp = null;
    this.pendingG = false;
    this.pendingR = false;
    this.countBuffer = "";
  }

  override handleInput(data: string): void {
    // Escape always cancels pending state and returns to normal.
    if (matchesKey(data, "escape")) {
      if (this.mode === "insert") {
        this.setMode("normal");
        this.clearState();
      } else {
        this.clearState();
        super.handleInput(data); // normal mode: abort agent, etc.
      }
      return;
    }

    // Insert mode: everything is the editor's business.
    if (this.mode === "insert") {
      super.handleInput(data);
      return;
    }

    // ── Normal mode ─────────────────────────────────────────────────────────

    // Pending r{char}: replace n characters.
    if (this.pendingR) {
      this.pendingR = false;
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        const n = this.count;
        this.clearState();
        for (let i = 0; i < n; i++) {
          this.send(S.delForward);    // remove char at cursor
          super.handleInput(data);    // insert replacement (cursor moves right)
        }
        this.send(S.left);            // land on the last replaced char
      } else {
        this.clearState();
      }
      return;
    }

    // Pending g{char}: complete g-commands.
    if (this.pendingG) {
      this.pendingG = false;
      if (data === "g") {
        this.clearState();
        this.send(S.up, MAX_LINES);
        this.send(S.lineStart);
      } else {
        this.clearState(); // unknown g-combo — cancel silently
      }
      return;
    }

    // Pending operator: waiting for a motion to complete it.
    if (this.pendingOp !== null) {
      const op = this.pendingOp;

      // Digits after the operator accumulate a motion count (d3w = delete 3 words).
      if (data >= "0" && data <= "9") {
        this.countBuffer += data;
        return;
      }

      this.pendingOp = null;
      const n = this.count;
      this.clearState();

      switch (op) {
        case "d": this.applyDelete("d", data, n); break;
        case "c": this.applyDelete("c", data, n); this.setMode("insert"); break;
        case "y": this.applyYank(data, n); break;
      }
      return;
    }

    // ── Ctrl+D / Ctrl+U scroll (normal mode only) ──────────────────────────
    //
    // Ctrl+D is eaten entirely — passing it to super risks app.exit when the
    // buffer is empty (app.exit is bound to ctrl+d).
    // Ctrl+U clobbers tui.editor.deleteToLineStart in normal mode; that's fine
    // because dd / d0 / d^ cover the delete use case.
    // Count prefix is honoured: 3<Ctrl+D> scrolls 3×SCROLL_LINES.

    if (data === "\x04") { // Ctrl+D — scroll down
      const n = this.count;
      this.clearState();
      this.send(S.down, n * SCROLL_LINES);
      return;
    }
    if (data === "\x15") { // Ctrl+U — scroll up
      const n = this.count;
      this.clearState();
      this.send(S.up, n * SCROLL_LINES);
      return;
    }

    // ── Count prefix ────────────────────────────────────────────────────────

    // 1–9 always starts/extends the count buffer.
    if (data >= "1" && data <= "9") {
      this.countBuffer += data;
      return;
    }
    // 0 only extends an existing count (otherwise it means line-start).
    if (data === "0" && this.countBuffer.length > 0) {
      this.countBuffer += data;
      return;
    }

    // ── Operators and pending-state keys (preserve countBuffer) ─────────────

    switch (data) {
      case "d": this.pendingOp = "d"; return;
      case "c": this.pendingOp = "c"; return;
      case "y": this.pendingOp = "y"; return;
      case "g": this.pendingG = true; return;
      case "r": this.pendingR = true; return;
    }

    // ── Standalone commands (consume count then execute) ────────────────────

    const n = this.count;
    this.clearState();

    switch (data) {
      // Navigation
      case "h": this.send(S.left,  n); break;
      case "j": this.send(S.down,  n); break;
      case "k": this.send(S.up,    n); break;
      case "l": this.send(S.right, n); break;
      // w: first char of next word — Alt+F lands on the trailing space, one → skips it.
      // Edge case: when cursor is already on a space, Alt+F jumps to end of the
      // next word instead of its start, so w may overshoot in that position.
      case "w": case "W":
        for (let i = 0; i < n; i++) { this.send(S.wordEndRaw); this.send(S.right); }
        break;
      case "b": case "B": this.send(S.wordBackward, n); break;
      // e: last char of word — Alt+F lands one past it, one ← brings us back.
      case "e": case "E":
        for (let i = 0; i < n; i++) { this.send(S.wordEndRaw); this.send(S.left); }
        break;
      case "0": this.send(S.lineStart); break;
      case "^": this.send(S.lineStart); break;
      case "$": this.send(S.lineEnd);   break;
      case "G": this.send(S.down, MAX_LINES); this.send(S.lineEnd); break;

      // Delete/change one-key shortcuts
      case "x": this.send(S.delForward,  n); break;
      case "X": this.send(S.delBackward, n); break;
      case "D": this.send(S.delToLineEnd); break;
      case "C": this.send(S.delToLineEnd); this.setMode("insert"); break;
      case "s": this.send(S.delForward,  n); this.setMode("insert"); break;
      case "S": this.send(S.lineStart); this.send(S.delToLineEnd); this.setMode("insert"); break;

      // Paste from kill ring, undo
      case "p": case "P": this.send(S.paste, n); break;
      case "u": this.send(S.undo, n); break;

      // Insert mode entry
      case "i": this.setMode("insert"); break;
      case "a": this.send(S.right); this.setMode("insert"); break;
      case "I": this.send(S.lineStart); this.setMode("insert"); break;
      case "A": this.send(S.lineEnd);   this.setMode("insert"); break;

      default:
        // Pass remaining control sequences (Ctrl+C, etc.) through; eat printable chars.
        // Note: Ctrl+D and Ctrl+U are already handled above and never reach here.
        if (data.length > 1 || data.charCodeAt(0) < 32) {
          super.handleInput(data);
        }
        break;
    }
  }

  /**
   * Apply a delete (or change) operator + motion.
   * The caller handles the mode switch for 'c'.
   */
  private applyDelete(op: "d" | "c", motion: string, n: number): void {
    // dd / cc: operate on the whole line
    if (motion === op) {
      for (let i = 0; i < n; i++) {
        this.send(S.lineStart);
        this.send(S.delToLineEnd);
        this.send(S.delForward); // remove the trailing newline
      }
      return;
    }

    switch (motion) {
      case "w": case "W": this.send(S.delWordForward,  n); break;
      case "b": case "B": this.send(S.delWordBackward, n); break;
      case "e": case "E": this.send(S.delWordForward,  n); break;
      case "$":           this.send(S.delToLineEnd);        break;
      case "0": case "^": this.send(S.delToLineStart);      break;
      case "h":           this.send(S.delBackward, n);      break;
      case "l":           this.send(S.delForward,  n);      break;
      case "G":
        // Delete from here to end of buffer.
        this.send(S.delToLineEnd);
        for (let i = 0; i < MAX_LINES; i++) {
          this.send(S.delForward);    // remove newline
          this.send(S.delToLineEnd);  // remove next line's content
        }
        break;
      // Unknown motion: cancel silently (nothing happens).
    }
  }

  /**
   * Simulate yank via kill+paste: text is removed, put in kill ring, then
   * immediately pasted back so the buffer is unchanged. Subsequent `p` works
   * because the kill ring holds the content.
   *
   * Cursor position after yank approximates vim (may be off by a word boundary).
   */
  private applyYank(motion: string, n: number): void {
    // yy: yank line
    if (motion === "y") {
      this.send(S.lineStart);
      this.send(S.delToLineEnd); // cut to kill ring
      this.send(S.paste);        // put back
      this.send(S.lineStart);    // cursor to line start, matching vim
      return;
    }

    switch (motion) {
      case "w": case "W":
        this.send(S.delWordForward,  n); this.send(S.paste, n); break;
      case "b": case "B":
        this.send(S.delWordBackward, n); this.send(S.paste, n); break;
      case "e": case "E":
        this.send(S.delWordForward,  n); this.send(S.paste, n); break;
      case "$":
        this.send(S.delToLineEnd); this.send(S.paste); break;
      case "0": case "^":
        this.send(S.delToLineStart); this.send(S.paste); break;
      // Unknown motion: no-op.
    }
  }

  override render(width: number): string[] {
    const lines = super.render(width);
    if (lines.length === 0) return lines;

    const modeLabel = this.mode === "normal" ? "NORMAL" : "INSERT";
    const pendingHint =
      this.pendingOp ?? (this.pendingG ? "g" : this.pendingR ? "r" : "");
    const countHint = this.countBuffer;
    const hint = countHint || pendingHint ? ` [${countHint}${pendingHint}]` : "";
    const label = ` ${modeLabel}${hint} `;

    // When autocomplete (slash-command suggestions) is NOT showing, the bottom
    // border is always the last line.  Cache that index so that when suggestions
    // ARE showing — and super.render() appends their lines after the border —
    // we still know exactly where the border sits without inspecting line content.
    if (!this.isShowingAutocomplete()) {
      this._lastBorderIndex = lines.length - 1;
    }
    const borderIndex = this._lastBorderIndex;

    // Splice the label into the border a few characters in from the left.
    const INDENT = 2;
    const borderLine = lines[borderIndex]!;
    const labelWidth = visibleWidth(label);
    if (visibleWidth(borderLine) >= INDENT + labelWidth) {
      const before = truncateToWidth(borderLine, INDENT, "");
      const after  = sliceByColumn(borderLine, INDENT + labelWidth, width - INDENT - labelWidth);
      lines[borderIndex] = before + label + after;
    }

    return lines;
  }
}
