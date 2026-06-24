# pi-vi

Vim modal editing for the [pi](https://github.com/earendil-works/pi-mono) coding agent input editor.

## Quick start

Test in a single session:

```sh
pi -e ./index.ts
```

Install globally (always on):

```sh
ln -s "$(pwd)" ~/.pi/agent/extensions/pi-vi
```

After symlinking, run `/reload` inside pi or restart it.

## Modes

| Mode | Indicator | How to enter |
|------|-----------|-------------|
| Insert | `-- INSERT --` | `i`, `a`, `I`, `A`, or start of session |
| Normal | `-- NORMAL --` | `Esc` from Insert |

The mode is shown in both the editor's bottom border and the footer status bar.

In Normal mode, a count or pending operator appears as `[3d]` next to the mode label.

## Supported motions

### Navigation

| Key | Motion |
|-----|--------|
| `h` / `l` | left / right |
| `j` / `k` | down / up |
| `w` / `W` | word forward |
| `b` / `B` | word backward |
| `e` / `E` | end of word (approximated as word forward) |
| `0` / `^` | line start |
| `$` | line end |
| `gg` | buffer start |
| `G` | buffer end |

All navigation keys accept a count prefix: `5j`, `3w`, etc.

### Insert mode entry

| Key | Action |
|-----|--------|
| `i` | insert before cursor |
| `a` | append after cursor |
| `I` | insert at line start |
| `A` | append at line end |

### Operators

Operators combine with a motion: `d{motion}`, `c{motion}`, `y{motion}`.

| Operator | Effect |
|----------|--------|
| `d` | delete (text goes to kill ring) |
| `c` | change (delete + enter Insert mode) |
| `y` | yank (kill-ring simulation — see below) |

#### Operator + motion examples

| Keys | Action |
|------|--------|
| `dd` | delete current line |
| `dw` | delete word forward |
| `db` | delete word backward |
| `d$` | delete to line end |
| `d0` | delete to line start |
| `dG` | delete to buffer end |
| `3dw` | delete 3 words |
| `cc` | change current line |
| `cw` | change word |
| `yy` | yank current line |
| `yw` | yank word forward |
| `y$` | yank to line end |

#### Yank simulation

True yank requires reading the buffer, which the extension API does not expose.
Instead, `y{motion}` kills the text (putting it in the editor's kill ring), then
immediately pastes it back so the buffer is unchanged. `p` then pastes from the
kill ring. This means:

- The buffer always looks correct after a yank.
- `p` works as expected after any `y` or `d` operation.
- Cursor position after yank may be off by a word boundary vs. stock vim.

### Single-key commands

| Key | Action |
|-----|--------|
| `x` | delete char forward |
| `X` | delete char backward |
| `D` | delete to line end |
| `C` | change to line end |
| `s` | substitute char (delete + insert) |
| `S` | substitute line (clear line + insert) |
| `r{char}` | replace n chars with `char` |
| `p` / `P` | paste from kill ring |
| `u` | undo |
| `Ctrl+D` | scroll down ~10 lines |
| `Ctrl+U` | scroll up ~10 lines |

### Count prefix

Any motion or command can be prefixed with a number: `3dw` deletes 3 words,
`5j` moves down 5 lines, `2x` deletes 2 chars. Counts also work inside an
operator: `d3w` and `3dw` are equivalent.

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

## Files

```
pi-vi/
├── index.ts   extension entry point — wires mode status into the footer
├── editor.ts  VimEditor class — all motion and state-machine logic
└── package.json
```
