# Contributing

## Dev setup

Test in a single session without installing:

```sh
pi -e ./index.ts
```

Install globally (symlink, always on):

```sh
ln -s "$(pwd)" ~/.pi/agent/extensions/pi-vi
```

After symlinking, run `/reload` inside pi or restart it.

## Files

```
pi-vi/
├── index.ts     extension entry point — wires the editor component and mode re-renders
├── editor.ts    VimEditor class — all motion and state-machine logic
└── package.json
```

## Architecture

`VimEditor` extends `CustomEditor` from the pi SDK. It intercepts every keypress in `handleInput()` and either:

- passes it straight through to `super.handleInput()` (Insert mode, or control sequences in Normal mode), or
- translates it into one or more terminal escape sequences that the underlying editor understands (motions, operators, etc.).

The editor never reads the buffer. Yank is simulated by killing text into the kill ring and immediately pasting it back.

Mode changes call `onModeChange`, which triggers a `tui.requestRender()` so the border label updates.

## Known limitations / not implemented

| Feature | Reason |
|---------|--------|
| `o` / `O` (open line) | Shift+Enter sequence varies by terminal; skipped to avoid breakage |
| `f` / `F` / `t` / `T` | Requires scanning buffer content — not exposed by the API |
| `.` repeat | Requires recording the last change — not implemented yet |
| Visual mode (`v` / `V`) | Requires selection API — not exposed |
| Text objects (`ci(`, `da"`) | Requires buffer scanning — not exposed |
| True named registers | Kill-ring simulation used instead |
| `Ngg` go to line N | Line-number seeking not possible via escape sequences |
